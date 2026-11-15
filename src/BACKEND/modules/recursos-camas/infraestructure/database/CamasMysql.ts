import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise'
import type { EjecutorMysql } from './ContratosMysql.js'
import { mapearCama, type CamaFila } from '../mappers/CamaMapper.js'
import type { Cama } from '../../domain/entities/Cama.js'
import { ErrorRecursosCamas } from '../../domain/errors/ErrorRecursosCamas.js'

interface AsignacionActivaFila extends RowDataPacket {
  id: number
}

export async function bloquearCama(db: EjecutorMysql, idCama: number) {
  const [filas] = await db.execute<CamaFila[]>(
    'SELECT id, estado, habitacion, piso, id_tipo_cama FROM camas WHERE id = ? FOR UPDATE',
    [idCama],
  )
  const fila = filas[0]
  if (!fila) throw new ErrorRecursosCamas('CAMA_NO_ENCONTRADA', 'La cama no existe.')
  return { cama: mapearCama(fila), estadoPersistido: fila.estado }
}

export async function buscarAsignacionesActivas(db: EjecutorMysql, idCama: number) {
  const [filas] = await db.execute<AsignacionActivaFila[]>(
    'SELECT id FROM asignaciones_camas WHERE id_cama = ? AND fecha_egreso IS NULL FOR UPDATE',
    [idCama],
  )
  return filas
}

export async function guardarEstadoCama(db: EjecutorMysql, cama: Cama, estadoPersistido: string) {
  const [resultado] = await db.execute<ResultSetHeader>(
    'UPDATE camas SET estado = ? WHERE id = ? AND estado = ?',
    [cama.estado, cama.id, estadoPersistido],
  )
  if (resultado.affectedRows !== 1) {
    throw new ErrorRecursosCamas(
      'CAMA_NO_DISPONIBLE',
      'La cama cambió de estado. Actualizá el mapa.',
    )
  }
}
