import { describe, expect, it, vi } from 'vitest'
import { crearProveedorTransacciones } from '../../infraestructure/database/ContratosMysql.js'
import { prepararMysql } from '../helpers/mysql.js'

describe('adaptación del proveedor compartido de transacciones', () => {
  it('entrega la conexión del proveedor y devuelve su resultado', async () => {
    const { db } = prepararMysql([])
    const llamada = vi.fn()
    const proveedor = crearProveedorTransacciones({
      async withTransaction<T>(operacion: (conexion: typeof db) => Promise<T>) {
        llamada()
        return operacion(db)
      },
    })
    const operacion = vi.fn(async (conexion) => {
      expect(conexion).toBe(db)
      return 42
    })
    expect(await proveedor.ejecutar(operacion)).toBe(42)
    expect(llamada).toHaveBeenCalledOnce()
    expect(operacion).toHaveBeenCalledOnce()
  })
  it('no oculta errores ni reintenta un commit incierto', async () => {
    const error = new Error('Commit fallido')
    const llamada = vi.fn()
    const proveedor = crearProveedorTransacciones({
      async withTransaction() {
        llamada()
        throw error
      },
    })
    await expect(proveedor.ejecutar(async () => 42)).rejects.toBe(error)
    expect(llamada).toHaveBeenCalledOnce()
  })
})
