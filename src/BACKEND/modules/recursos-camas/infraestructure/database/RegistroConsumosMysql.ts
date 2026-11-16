import type { EjecutorMysql } from './ContratosMysql.js'
import type { ConsumoInsumo } from '../../domain/repositories/IInsumoRepository.js'
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise'
import { ErrorRecursosCamas } from '../../domain/errors/ErrorRecursosCamas.js'

export interface RegistroConsumosMysql {
  // La marca de procesado y el descuento se confirman o revierten juntos.
  registrarSiNuevo(db: EjecutorMysql, consumo: ConsumoInsumo): Promise<'nuevo' | 'duplicado'>
}

export function crearRegistroConsumosMysql(): RegistroConsumosMysql {
  return {
    async registrarSiNuevo(db, consumo) {
      if (consumo.idEvento !== `medicacion:${consumo.idAdministracion}`) {
        throw new ErrorRecursosCamas('CONSUMO_INCONSISTENTE', 'El evento no identifica su administración.')
      }
      const [filas] = await db.execute<(RowDataPacket & {
        id_insumo: number; cantidad: number; piso: number; estado: string
      })[]>(
        'SELECT id_insumo, cantidad, piso, estado FROM consumos_medicacion WHERE id_administracion = ? FOR UPDATE',
        [consumo.idAdministracion],
      )
      const fila = filas[0]
      if (!fila || fila.id_insumo !== consumo.idInsumo || fila.cantidad !== consumo.cantidad || fila.piso !== consumo.piso) {
        throw new ErrorRecursosCamas('CONSUMO_INCONSISTENTE', 'El consumo no coincide con la administración registrada.')
      }
      if (fila.estado === 'procesado') return 'duplicado'
      if (fila.estado !== 'pendiente') {
        throw new ErrorRecursosCamas('CONSUMO_INCONSISTENTE', 'El consumo requiere revisión y no puede descontarse automáticamente.')
      }
      const [resultado] = await db.execute<ResultSetHeader>(
        "UPDATE consumos_medicacion SET estado = 'procesado' WHERE id_administracion = ? AND estado = 'pendiente'",
        [consumo.idAdministracion],
      )
      if (resultado.affectedRows !== 1) throw new Error('No se pudo marcar el consumo como procesado.')
      return 'nuevo'
    },
  }
}
