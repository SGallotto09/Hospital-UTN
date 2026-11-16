import type { Database } from '../../../database/connectionDB.js'
import type { ConsumidorMedicacionAdministrada } from '../application/ports/MedicacionAdministrada.js'
import { ErrorRecursosCamas } from '../domain/errors/ErrorRecursosCamas.js'

export function iniciarProcesadorConsumos(
  database: Pick<Database, 'query'>,
  consumir: ConsumidorMedicacionAdministrada,
  intervalo = 5000,
  procesarFacturacion?: () => Promise<void>,
): () => Promise<void> {
  let detenido = false
  let temporizador: ReturnType<typeof setTimeout> | undefined
  let enCurso: Promise<void> = Promise.resolve()

  async function procesar() {
    try {
      const [resultado] = await database.query(
        "SELECT id_administracion, id_insumo, cantidad, piso FROM consumos_medicacion WHERE estado = 'pendiente' ORDER BY id_administracion LIMIT 10",
      )
      const pendientes = resultado as {
        id_administracion: number; id_insumo: number; cantidad: number; piso: number
      }[]
      for (const fila of pendientes) {
        if (detenido) break
        try {
          await consumir({
            tipo: 'MedicacionAdministrada', version: 1,
            idEvento: `medicacion:${fila.id_administracion}`,
            idAdministracion: fila.id_administracion, idInsumo: fila.id_insumo,
            cantidad: fila.cantidad, piso: fila.piso,
          })
        } catch (error) {
          if (error instanceof ErrorRecursosCamas &&
              (error.codigo === 'STOCK_INSUFICIENTE' || error.codigo === 'PISO_INSUMO_INVALIDO')) {
            // UPDATE bloquea la fila y reevalúa el estado; nunca pisa un procesado concurrente.
            await database.query(
              "UPDATE consumos_medicacion SET estado = 'revision' WHERE id_administracion = ? AND estado = 'pendiente'",
              [fila.id_administracion],
            )
            console.error(`Consumo ${fila.id_administracion} requiere revisión: ${error.codigo}`)
          } else {
            console.error(`No se pudo procesar el consumo ${fila.id_administracion}; se volverá a consultar.`, error)
          }
        }
      }
    } catch (error) {
      console.error('No se pudieron procesar los consumos pendientes.', error)
    } finally {
      // Facturación se recupera desde datos confirmados, incluso si el inventario falló.
      if (!detenido && procesarFacturacion) {
        try {
          await procesarFacturacion()
        } catch (error) {
          console.error('No se pudo recuperar la facturación de medicación.', error)
        }
      }
      if (!detenido) temporizador = setTimeout(ejecutar, intervalo)
    }
  }

  function ejecutar() { enCurso = procesar() }
  ejecutar()
  return async () => {
    detenido = true
    clearTimeout(temporizador)
    await enCurso
  }
}
