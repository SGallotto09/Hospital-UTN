import type { Database } from '../../../../database/connectionDB.js'
import type { FieldPacket, ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import type { EjecutorMysql } from './ContratosMysql.js'

// Sólo lecturas. La conexión actual NO satisface ProveedorTransaccionesMysql.
export class ConsultaMysqlCompartida implements EjecutorMysql {
  constructor(private readonly database: Pick<Database, 'query'>) {}

  async execute<T extends RowDataPacket[] | ResultSetHeader>(
    sql: string,
    valores?: (number | string | Date)[],
  ): Promise<[T, FieldPacket[]]> {
    const [resultado, campos] = await this.database.query(sql, valores)
    return [resultado as T, campos]
  }
}
