import type { IConsultaCamas } from '../../application/ports/IConsultaCamas.js'
import type { CamaDTO } from '../../application/dtos/CamasDTO.js'
import type { EjecutorMysql } from '../database/ContratosMysql.js'
import { mapearEstado, type CamaFila } from '../mappers/CamaMapper.js'
import { validarId } from '../../domain/errors/ErrorRecursosCamas.js'

interface CamaMapaFila extends CamaFila {
  tipo: string
  id_asignacion_activa: number | null
}

export class MysqlConsultaCamas implements IConsultaCamas {
  constructor(private readonly db: EjecutorMysql) {}

  async listar(): Promise<CamaDTO[]> {
    const [filas] = await this.db.execute<CamaMapaFila[]>(`
      SELECT c.id, c.estado, c.habitacion, c.piso, c.id_tipo_cama, t.nombre AS tipo,
        (SELECT a.id FROM asignaciones_camas a
          WHERE a.id_cama = c.id AND a.fecha_egreso IS NULL) AS id_asignacion_activa
      FROM camas c JOIN tipo_cama t ON t.id = c.id_tipo_cama
      ORDER BY c.piso, c.habitacion, c.id`)
    return filas.map((fila) => {
      validarId(fila.id, 'idCama')
      validarId(fila.id_tipo_cama, 'idTipoCama')
      const estado = mapearEstado(fila.estado)
      return {
        id: fila.id,
        estado,
        habitacion: fila.habitacion,
        piso: fila.piso,
        idTipoCama: fila.id_tipo_cama,
        tipo: fila.tipo,
        disponible: estado === 'Libre' && fila.id_asignacion_activa === null,
        idAsignacionActiva: fila.id_asignacion_activa,
      }
    })
  }
}
