import { describe, expect, it, vi } from 'vitest'
import { prepararMysql } from '../helpers/mysql.js'
import { MysqlInsumoRepository } from '../../infraestructure/repositories/MysqlInsumoRepository.js'
import { ErrorRecursosCamas } from '../../domain/errors/ErrorRecursosCamas.js'
import type { ConsumoInsumo } from '../../domain/repositories/IInsumoRepository.js'

const consumo: ConsumoInsumo = {
  idEvento: 'medicacion-20',
  idAdministracion: 20,
  idInsumo: 4,
  cantidad: 1,
  piso: 2,
}
const fila = { id: 4, nombre: 'Ibuprofeno 400mg', stock: 50, piso: 2 }

function preparar(respuestas: unknown[]) {
  const mysql = prepararMysql(respuestas)
  // Doble del registro pendiente. No acredita deduplicación durable real.
  const registrarSiNuevo = vi.fn().mockResolvedValue('nuevo')
  const repository = new MysqlInsumoRepository(mysql.db, mysql.transacciones, { registrarSiNuevo })
  return { ...mysql, registrarSiNuevo, repository }
}

describe('HU 3.1: contrato MySQL y registro de consumos', () => {
  it('sin registro durable falla antes de abrir transacción o escribir SQL', async () => {
    const mysql = prepararMysql([])
    const repo = new MysqlInsumoRepository(mysql.db, mysql.transacciones)
    await expect(repo.procesarConsumo(consumo)).rejects.toMatchObject({
      codigo: 'DEDUPLICACION_NO_DISPONIBLE',
    })
    expect(mysql.ejecutarSql).not.toHaveBeenCalled()
    expect(mysql.ejecutarTransaccion).not.toHaveBeenCalled()
  })
  it('sin transacciones falla antes de registrar o descontar', async () => {
    const mysql = prepararMysql([])
    const registrarSiNuevo = vi.fn()
    const repo = new MysqlInsumoRepository(mysql.db, undefined, { registrarSiNuevo })
    await expect(repo.procesarConsumo(consumo)).rejects.toMatchObject({
      codigo: 'TRANSACCIONES_NO_DISPONIBLES',
    })
    expect(registrarSiNuevo).not.toHaveBeenCalled()
    expect(mysql.ejecutarSql).not.toHaveBeenCalled()
  })
  it('registra y descuenta sobre la misma conexión con UPDATE condicionado', async () => {
    const { repository, registrarSiNuevo, db, ejecutarSql, ejecutarTransaccion } = preparar([
      [fila],
      { affectedRows: 1 },
    ])
    expect(await repository.procesarConsumo(consumo)).toEqual({
      estado: 'descontado',
      idEvento: 'medicacion-20',
      idAdministracion: 20,
      idInsumo: 4,
      cantidadDescontada: 1,
      stockRestante: 49,
    })
    expect(registrarSiNuevo).toHaveBeenCalledWith(db, consumo)
    expect(ejecutarTransaccion).toHaveBeenCalledOnce()
    expect(ejecutarSql.mock.calls[0]?.[0]).toContain('FOR UPDATE')
    expect(ejecutarSql.mock.calls[1]).toEqual([
      'UPDATE insumos SET stock = stock - ? WHERE id = ? AND piso = ? AND stock >= ?',
      [1, 4, 2, 1],
    ])
  })
  it('si el registro identifica un duplicado no ejecuta SQL de stock', async () => {
    const { repository, registrarSiNuevo, ejecutarSql } = preparar([])
    registrarSiNuevo.mockResolvedValue('duplicado')
    expect(await repository.procesarConsumo(consumo)).toMatchObject({
      estado: 'duplicado',
      cantidadDescontada: 0,
      stockRestante: null,
    })
    expect(ejecutarSql).not.toHaveBeenCalled()
  })
  it('un reenvío de la misma administración con otro eventId también pasa por el registro', async () => {
    const { repository, registrarSiNuevo, ejecutarSql } = preparar([[fila], { affectedRows: 1 }])
    registrarSiNuevo.mockResolvedValueOnce('nuevo').mockResolvedValueOnce('duplicado')
    await repository.procesarConsumo(consumo)
    expect(await repository.procesarConsumo({ ...consumo, idEvento: 'reenvio-20' })).toMatchObject({
      estado: 'duplicado',
    })
    expect(registrarSiNuevo).toHaveBeenCalledTimes(2)
    expect(ejecutarSql).toHaveBeenCalledTimes(2)
  })
  it('propaga un evento inconsistente sin modificar stock', async () => {
    const { repository, registrarSiNuevo, ejecutarSql } = preparar([])
    registrarSiNuevo.mockRejectedValue(
      new ErrorRecursosCamas('CONSUMO_INCONSISTENTE', 'La administración tiene otro consumo.'),
    )
    await expect(repository.procesarConsumo(consumo)).rejects.toMatchObject({
      codigo: 'CONSUMO_INCONSISTENTE',
    })
    expect(ejecutarSql).not.toHaveBeenCalled()
  })
  it('no interpreta una respuesta desconocida del registro como consumo nuevo', async () => {
    const { repository, registrarSiNuevo, ejecutarSql } = preparar([])
    registrarSiNuevo.mockResolvedValue(undefined)
    await expect(repository.procesarConsumo(consumo)).rejects.toThrow('resultado inválido')
    expect(ejecutarSql).not.toHaveBeenCalled()
  })
  it('rechaza insumo inexistente', async () => {
    const { repository } = preparar([[]])
    await expect(repository.procesarConsumo(consumo)).rejects.toMatchObject({
      codigo: 'INSUMO_NO_ENCONTRADO',
    })
  })
  it.each([0, 1])('no descuenta cantidad mayor al stock %s', async (stock) => {
    const { repository, ejecutarSql } = preparar([[{ ...fila, stock }]])
    await expect(repository.procesarConsumo({ ...consumo, cantidad: 2 })).rejects.toMatchObject({
      codigo: 'STOCK_INSUFICIENTE',
    })
    expect(ejecutarSql).toHaveBeenCalledTimes(1)
  })
  it.each([null, 3])('no toma existencias del piso %s para el piso 2', async (piso) => {
    const { repository, ejecutarSql } = preparar([[{ ...fila, piso }]])
    await expect(repository.procesarConsumo(consumo)).rejects.toMatchObject({
      codigo: 'PISO_INSUMO_INVALIDO',
    })
    expect(ejecutarSql).toHaveBeenCalledTimes(1)
  })
  it('propaga cero filas afectadas para rollback del registro', async () => {
    const { repository } = preparar([[fila], { affectedRows: 0 }])
    await expect(repository.procesarConsumo(consumo)).rejects.toMatchObject({
      codigo: 'STOCK_INSUFICIENTE',
    })
  })
  it('propaga un error SQL para rollback del registro', async () => {
    const error = new Error('Conexión perdida')
    const { repository } = preparar([[fila], error])
    await expect(repository.procesarConsumo(consumo)).rejects.toBe(error)
  })
  it('no informa éxito si falla el commit del proveedor', async () => {
    const mysql = prepararMysql([])
    const error = new Error('Commit fallido')
    const repo = new MysqlInsumoRepository(
      mysql.db,
      {
        ejecutar: async () => {
          throw error
        },
      },
      { registrarSiNuevo: vi.fn() },
    )
    await expect(repo.procesarConsumo(consumo)).rejects.toBe(error)
  })
  it('consulta existencias con la conexión compartida, sin exigir registro ni transacciones', async () => {
    const mysql = prepararMysql([[fila, { id: 5, nombre: 'Gasas', stock: 0, piso: null }]])
    expect(await new MysqlInsumoRepository(mysql.db).listar()).toEqual([
      fila,
      { id: 5, nombre: 'Gasas', stock: 0, piso: null },
    ])
    expect(mysql.ejecutarTransaccion).not.toHaveBeenCalled()
    expect(mysql.ejecutarSql).toHaveBeenCalledWith(
      'SELECT id, nombre, stock, piso FROM insumos ORDER BY piso, nombre, id',
      undefined,
    )
  })
})
