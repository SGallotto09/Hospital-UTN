import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import type {
  IAsignacionCamaRepository,
  SolicitudAsignacion,
} from '../../domain/repositories/IAsignacionCamaRepository.js'
import { AsignacionCama } from '../../domain/entities/AsignacionCama.js'
import type { Cama } from '../../domain/entities/Cama.js'
import { ErrorRecursosCamas } from '../../domain/errors/ErrorRecursosCamas.js'
import type { ProveedorTransaccionesMysql } from '../database/ContratosMysql.js'
import {
  bloquearCama,
  buscarAsignacionesActivas,
  guardarEstadoCama,
} from '../database/CamasMysql.js'

interface IngresoFila extends RowDataPacket {
  fecha_ingreso: Date
}

function esCamaDuplicada(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    error.code === 'ER_DUP_ENTRY' &&
    error.message.includes('uq_cama_activa')
  )
}

export class MysqlAsignacionCamaRepository implements IAsignacionCamaRepository {
  constructor(private readonly transacciones?: ProveedorTransaccionesMysql) {}

  async asignarSiDisponible(
    solicitud: SolicitudAsignacion,
    ocupar: (cama: Cama) => void,
  ): Promise<AsignacionCama> {
    if (!this.transacciones) {
      throw new ErrorRecursosCamas(
        'TRANSACCIONES_NO_DISPONIBLES',
        'La asignación requiere integrar transacciones exclusivas con la conexión MySQL compartida.',
      )
    }
    try {
      return await this.transacciones.ejecutar(async (db) => {
        const { cama, estadoPersistido } = await bloquearCama(db, solicitud.idCama)
        ocupar(cama)
        const activas = await buscarAsignacionesActivas(db, solicitud.idCama)
        if (activas.length)
          throw new ErrorRecursosCamas(
            'CAMA_NO_DISPONIBLE',
            'La cama ya tiene una asignación activa. Actualizá el mapa.',
          )
        await guardarEstadoCama(db, cama, estadoPersistido)
        const [insercion] = await db.execute<ResultSetHeader>(
          `
          INSERT INTO asignaciones_camas (id_cama, id_paciente, id_usuario_asignador)
          VALUES (?, ?, ?)`,
          [cama.id, solicitud.idPaciente, solicitud.idUsuarioAsignador],
        )
        // MySQL genera fecha_ingreso; no se escribe la columna generada id_cama_activa.
        const [ingresos] = await db.execute<IngresoFila[]>(
          'SELECT fecha_ingreso FROM asignaciones_camas WHERE id = ?',
          [insercion.insertId],
        )
        const ingreso = ingresos[0]
        if (!ingreso) throw new Error('No se pudo recuperar la asignación creada.')
        return new AsignacionCama(
          insercion.insertId,
          cama.id,
          solicitud.idPaciente,
          solicitud.idUsuarioAsignador,
          ingreso.fecha_ingreso,
        )
      })
    } catch (error) {
      if (esCamaDuplicada(error)) {
        throw new ErrorRecursosCamas(
          'CAMA_NO_DISPONIBLE',
          'La cama acaba de ser ocupada. Actualizá el mapa.',
        )
      }
      throw error
    }
  }
}
