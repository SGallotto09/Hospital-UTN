import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import type { ICamaRepository, NuevaCama, TipoCama } from '../../domain/repositories/ICamaRepository.js'
import { ErrorRecursosCamas } from '../../domain/errors/ErrorRecursosCamas.js'
import type { EjecutorMysql } from '../database/ContratosMysql.js'

export class MysqlCamaRepository implements ICamaRepository {
  constructor(private readonly db: EjecutorMysql) {}

  async listarTipos(): Promise<TipoCama[]> {
    const [filas] = await this.db.execute<(RowDataPacket & TipoCama)[]>(
      'SELECT id, nombre FROM tipo_cama ORDER BY nombre, id',
    )
    return filas.map(({ id, nombre }) => ({ id, nombre }))
  }

  async crear(datos: NuevaCama): Promise<number> {
    try {
      const [resultado] = await this.db.execute<ResultSetHeader>(
        "INSERT INTO camas (habitacion, piso, id_tipo_cama, estado) VALUES (?, ?, ?, 'Libre')",
        [datos.habitacion, datos.piso, datos.idTipoCama],
      )
      return resultado.insertId
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'ER_DUP_ENTRY') {
          throw new ErrorRecursosCamas('CAMA_DUPLICADA', 'La cama ya existe según las restricciones de la base.')
        }
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
          throw new ErrorRecursosCamas('DATOS_INVALIDOS', 'El tipo de cama seleccionado no existe.')
        }
      }
      throw error
    }
  }
}
