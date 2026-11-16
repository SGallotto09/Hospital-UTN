import type { ResultSetHeader } from 'mysql2/promise'
import type { EjecutorMysql } from '../database/ContratosMysql.js'
import { Cama } from '../../domain/entities/Cama.js'
import { ErrorRecursosCamas } from '../../domain/errors/ErrorRecursosCamas.js'
import type {
  DatosRegistroCama,
  IRegistroCamaRepository,
} from '../../domain/repositories/IRegistroCamaRepository.js'

export class MysqlRegistroCamaRepository implements IRegistroCamaRepository {
  constructor(private readonly db: EjecutorMysql) {}

  async registrar(datos: DatosRegistroCama): Promise<Cama> {
    const [resultado] = await this.db.execute<ResultSetHeader>(`
      INSERT INTO camas (estado, habitacion, piso, id_tipo_cama)
      SELECT 'Libre', ?, ?, tipo.id
      FROM tipo_cama tipo
      WHERE tipo.id = ?
    `, [datos.habitacion, datos.piso, datos.idTipoCama])

    if (resultado.affectedRows !== 1 || resultado.insertId <= 0) {
      throw new ErrorRecursosCamas('DATOS_INVALIDOS', 'El tipo de cama seleccionado ya no existe.')
    }

    return new Cama({
      id: resultado.insertId,
      estado: 'Libre',
      habitacion: datos.habitacion,
      piso: datos.piso,
      idTipoCama: datos.idTipoCama,
    })
  }
}
