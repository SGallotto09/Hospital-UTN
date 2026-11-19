import { describe, expect, it, vi } from 'vitest'
import { ProcesarConsumoInsumo } from '../../application/use-cases/ProcesarConsumoInsumo.js'
import { MysqlInsumoRepository } from '../../infraestructure/repositories/MysqlInsumoRepository.js'
import { prepararMysql } from '../helpers/mysql.js'

// Integración entre componentes propios con SQL/registro controlados.
// No prueba entrega asíncrona real, persistencia durable ni aislamiento de MySQL.
describe('HU 3.1: consumidor, caso de uso y adaptador', () => {
  const evento = {
    tipo: 'MedicacionAdministrada',
    version: 1,
    idEvento: 'evento-20',
    idAdministracion: 20,
    idInsumo: 4,
    cantidad: 1,
    piso: 2,
  }

  it('procesa el ejemplo 50 → 49 y deja el reenvío a cargo del registro', async () => {
    const mysql = prepararMysql([
      [{ id: 4, nombre: 'Ibuprofeno 400mg', stock: 50, piso: 2 }],
      { affectedRows: 1 },
    ])
    const registrarSiNuevo = vi
      .fn()
      .mockResolvedValueOnce('nuevo')
      .mockResolvedValueOnce('duplicado')
    const caso = new ProcesarConsumoInsumo(
      new MysqlInsumoRepository(mysql.db, mysql.transacciones, { registrarSiNuevo }),
    )
    const recibir = (datos: unknown) => caso.ejecutar(datos)
    await expect(recibir(evento)).resolves.toMatchObject({
      estado: 'descontado',
      stockRestante: 49,
    })
    await expect(recibir(evento)).resolves.toMatchObject({
      estado: 'duplicado',
      cantidadDescontada: 0,
    })
    expect(mysql.ejecutarSql).toHaveBeenCalledTimes(2)
    expect(registrarSiNuevo).toHaveBeenCalledTimes(2)
  })
  it('una entrega sin deduplicación configurada se rechaza sin tocar existencias', async () => {
    const mysql = prepararMysql([])
    const caso = new ProcesarConsumoInsumo(new MysqlInsumoRepository(mysql.db, mysql.transacciones))
    await expect(caso.ejecutar(evento)).rejects.toMatchObject({
      codigo: 'DEDUPLICACION_NO_DISPONIBLE',
    })
    expect(mysql.ejecutarSql).not.toHaveBeenCalled()
  })
})
