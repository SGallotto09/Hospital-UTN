import type { FieldPacket, ResultSetHeader, RowDataPacket } from 'mysql2/promise'

export interface EjecutorMysql {
  execute<T extends RowDataPacket[] | ResultSetHeader>(
    sql: string,
    valores?: (number | string | Date)[],
  ): Promise<[T, FieldPacket[]]>
}

export interface ProveedorTransaccionesMysql {
  // Contrato requerido al proveedor compartido:
  // conexión exclusiva por callback, BEGIN/COMMIT/ROLLBACK y liberación en finally.
  // No pasar Database.query ni compartir la conexión con otras solicitudes.
  ejecutar<T>(operacion: (conexion: EjecutorMysql) => Promise<T>): Promise<T>
}

// Adaptación al método propuesto del Singleton compartido. No crea conexiones.
export function crearProveedorTransacciones(database: {
  withTransaction<T>(operacion: (conexion: EjecutorMysql) => Promise<T>): Promise<T>
}): ProveedorTransaccionesMysql {
  return { ejecutar: (operacion) => database.withTransaction(operacion) }
}
