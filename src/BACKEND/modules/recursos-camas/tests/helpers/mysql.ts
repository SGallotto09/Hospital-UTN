import { vi } from 'vitest'
import type { FieldPacket, ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import type {
  EjecutorMysql,
  ProveedorTransaccionesMysql,
} from '../../infraestructure/database/ContratosMysql.js'

// Respuestas programadas para pruebas unitarias: no reproduce locks ni rollback de MySQL.
export function prepararMysql(respuestas: unknown[]) {
  const ejecutarSql = vi.fn(async (_sql: string, _valores?: (number | string | Date)[]) => {
    const resultado = respuestas.shift()
    if (resultado instanceof Error) throw resultado
    if (resultado === undefined) throw new Error('Consulta SQL no esperada.')
    return [resultado, []]
  })
  const db: EjecutorMysql = {
    async execute<T extends RowDataPacket[] | ResultSetHeader>(
      sql: string,
      valores?: (number | string | Date)[],
    ) {
      return (await ejecutarSql(sql, valores)) as [T, FieldPacket[]]
    },
  }
  const ejecutarTransaccion = vi.fn()
  const transacciones: ProveedorTransaccionesMysql = {
    async ejecutar<T>(operacion: (conexion: EjecutorMysql) => Promise<T>): Promise<T> {
      ejecutarTransaccion()
      return operacion(db)
    },
  }
  return { db, transacciones, ejecutarSql, ejecutarTransaccion }
}
