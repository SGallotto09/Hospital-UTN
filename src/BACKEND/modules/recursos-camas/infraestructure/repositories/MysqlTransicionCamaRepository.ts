import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise'
import type {
  ITransicionCamaRepository,
  SolicitudTransicionCama,
  ResultadoTransicionCama,
} from '../../domain/repositories/ITransicionCamaRepository.js'
import type { Cama } from '../../domain/entities/Cama.js'
import type { ProveedorTransaccionesMysql } from '../database/ContratosMysql.js'
import {
  bloquearCama,
  buscarAsignacionesActivas,
  guardarEstadoCama,
} from '../database/CamasMysql.js'
import { ErrorRecursosCamas } from '../../domain/errors/ErrorRecursosCamas.js'

interface EgresoFila extends RowDataPacket {
  fecha_egreso: Date
}

export class MysqlTransicionCamaRepository implements ITransicionCamaRepository {
  constructor(private readonly transacciones?: ProveedorTransaccionesMysql) {}

  async transicionar(
    solicitud: SolicitudTransicionCama,
    aplicar: (cama: Cama) => void,
  ): Promise<ResultadoTransicionCama> {
    if (!this.transacciones) {
      throw new ErrorRecursosCamas(
        'TRANSACCIONES_NO_DISPONIBLES',
        'El cambio de estado requiere integrar transacciones exclusivas con MySQL compartido.',
      )
    }
    return this.transacciones.ejecutar(async (db) => {
      const { cama, estadoPersistido } = await bloquearCama(db, solicitud.idCama)
      if (cama.estado !== solicitud.estadoEsperado) {
        throw new ErrorRecursosCamas(
          'TRANSICION_INVALIDA',
          'El estado de la cama cambió. Actualizá el mapa.',
        )
      }
      const estadoAnterior = cama.estado
      aplicar(cama)
      const activas = await buscarAsignacionesActivas(db, cama.id)
      let fechaEgreso: Date | null = null
      let idAsignacionFinalizada: number | null = null
      if (solicitud.accion === 'liberar') {
        if (activas.length !== 1 || activas[0]?.id !== solicitud.idAsignacion) {
          throw new ErrorRecursosCamas(
            'TRANSICION_INVALIDA',
            'La asignación activa no coincide con la liberación solicitada. Actualizá el mapa.',
          )
        }
        const [cierre] = await db.execute<ResultSetHeader>(
          `UPDATE asignaciones_camas SET fecha_egreso = CURRENT_TIMESTAMP
           WHERE id = ? AND id_cama = ? AND fecha_egreso IS NULL`,
          [solicitud.idAsignacion, cama.id],
        )
        if (cierre.affectedRows !== 1) {
          throw new ErrorRecursosCamas(
            'TRANSICION_INVALIDA',
            'La asignación ya fue liberada. Actualizá el mapa.',
          )
        }
        const [egresos] = await db.execute<EgresoFila[]>(
          'SELECT fecha_egreso FROM asignaciones_camas WHERE id = ?',
          [solicitud.idAsignacion],
        )
        const egreso = egresos[0]?.fecha_egreso
        if (!(egreso instanceof Date) || Number.isNaN(egreso.getTime())) {
          throw new Error('No se pudo recuperar la fecha de egreso de la asignación.')
        }
        fechaEgreso = egreso
        idAsignacionFinalizada = solicitud.idAsignacion
      } else if (activas.length) {
        throw new ErrorRecursosCamas(
          'TRANSICION_INVALIDA',
          'La cama conserva una asignación activa. No se puede modificar su estado logístico.',
        )
      }
      await guardarEstadoCama(db, cama, estadoPersistido)
      return {
        idCama: cama.id,
        estadoAnterior,
        estado: cama.estado,
        idAsignacionFinalizada,
        fechaEgreso,
      }
    })
  }
}
