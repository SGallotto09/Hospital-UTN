import { Database } from '../../../database/connectionDB.js'
import { ConsultaMysqlCompartida } from '../infraestructure/database/ConsultaMysqlCompartida.js'
import { MysqlConsultaCamas } from '../infraestructure/repositories/MysqlConsultaCamas.js'
import { MysqlInsumoRepository } from '../infraestructure/repositories/MysqlInsumoRepository.js'

// Diagnóstico explícito por consola: usa el Singleton real y sólo ejecuta SELECT.
// No es un servidor, una autenticación alternativa ni una conexión independiente.
let codigoSalida = 0
try {
  const lectura = new ConsultaMysqlCompartida(Database.getInstance())
  const camas = await new MysqlConsultaCamas(lectura).listar()
  const insumos = await new MysqlInsumoRepository(lectura).listar()
  console.log(
    JSON.stringify(
      {
        camas: camas.length,
        camasDisponibles: camas.filter((cama) => cama.disponible).length,
        pisosCamas: [...new Set(camas.map((cama) => cama.piso))],
        insumos: insumos.length,
        insumosSinStock: insumos.filter((insumo) => insumo.stock === 0).length,
        pisosInventario: [...new Set(insumos.map((insumo) => insumo.piso))],
      },
      null,
      2,
    ),
  )
} catch (error) {
  codigoSalida = 1
  const codigo = error instanceof Error && 'code' in error ? String(error.code) : 'ERROR_LECTURA'
  console.error(`No se pudieron verificar las lecturas reales: ${codigo}.`)
} finally {
  // Database actual no expone cierre; sólo termina este proceso de diagnóstico.
  process.exit(codigoSalida)
}
