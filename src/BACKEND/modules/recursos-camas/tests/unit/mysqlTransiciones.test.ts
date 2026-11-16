import { describe, expect, it, vi } from 'vitest'
import { MysqlTransicionCamaRepository } from '../../infraestructure/repositories/MysqlTransicionCamaRepository.js'
import { TransicionarCama } from '../../application/use-cases/TransicionarCama.js'
import type { TransicionCamaDTO } from '../../application/dtos/CamasDTO.js'
import { prepararMysql } from '../helpers/mysql.js'

const fila = { id: 101, estado: 'Ocupada', habitacion: 204, piso: 2, id_tipo_cama: 1 }
const fecha = new Date('2026-11-15T13:00:00Z')
const liberar: TransicionCamaDTO = {
  accion: 'liberar',
  idCama: 101,
  estadoEsperado: 'Ocupada',
  idAsignacion: 50,
  motivo: 'alta',
  idUsuario: 3,
}

function preparar(respuestas: unknown[]) {
  const mysql = prepararMysql(respuestas)
  return {
    caso: new TransicionarCama(new MysqlTransicionCamaRepository(mysql.transacciones)),
    sql: mysql.ejecutarSql,
    ejecutar: mysql.ejecutarTransaccion,
  }
}

describe('HU 2.1: contrato SQL de transiciones', () => {
  it('sin proveedor transaccional no ejecuta siquiera la regla', async () => {
    const aplicar = vi.fn()
    await expect(
      new MysqlTransicionCamaRepository().transicionar(liberar, aplicar),
    ).rejects.toMatchObject({ codigo: 'TRANSACCIONES_NO_DISPONIBLES' })
    expect(aplicar).not.toHaveBeenCalled()
  })
  it.each(['alta', 'traslado'] as const)(
    'libera por %s cerrando asignación y cambiando a En limpieza',
    async (motivo) => {
      const { caso, sql, ejecutar } = preparar([
        [fila],
        [{ id: 50 }],
        { affectedRows: 1 },
        [{ fecha_egreso: fecha }],
        { affectedRows: 1 },
      ])
      expect(await caso.ejecutar({ ...liberar, motivo })).toEqual({
        idCama: 101,
        estadoAnterior: 'Ocupada',
        estado: 'En limpieza',
        idAsignacionFinalizada: 50,
        fechaEgreso: fecha.toISOString(),
      })
      expect(ejecutar).toHaveBeenCalledOnce()
      expect(sql.mock.calls[0]?.[0]).toContain('FOR UPDATE')
      expect(sql.mock.calls[1]?.[0]).toContain('fecha_egreso IS NULL FOR UPDATE')
      expect(sql.mock.calls[2]?.[0]).toContain('fecha_egreso = CURRENT_TIMESTAMP')
      expect(sql.mock.calls[2]?.[1]).toEqual([50, 101])
      expect(sql.mock.calls[4]?.[1]).toEqual(['En limpieza', 101, 'Ocupada'])
      expect(sql.mock.calls.some(([consulta]) => /DELETE|INSERT|ALTER|CREATE/.test(consulta))).toBe(
        false,
      )
    },
  )
  it('rechaza cama inexistente', async () => {
    const { caso } = preparar([[]])
    await expect(caso.ejecutar(liberar)).rejects.toMatchObject({ codigo: 'CAMA_NO_ENCONTRADA' })
  })
  it('rechaza un estado esperado desactualizado sin consultar ni escribir asignaciones', async () => {
    const { caso, sql } = preparar([[{ ...fila, estado: 'En limpieza' }]])
    await expect(caso.ejecutar(liberar)).rejects.toMatchObject({ codigo: 'TRANSICION_INVALIDA' })
    expect(sql).toHaveBeenCalledTimes(1)
  })
  it('no permite liberar desde Libre aunque coincida con el estado esperado', async () => {
    const { caso, sql } = preparar([[{ ...fila, estado: 'Libre' }]])
    await expect(caso.ejecutar({ ...liberar, estadoEsperado: 'Libre' })).rejects.toMatchObject({
      codigo: 'TRANSICION_INVALIDA',
    })
    expect(sql).toHaveBeenCalledTimes(1)
  })
  it.each([{ activas: [] }, { activas: [{ id: 51 }] }, { activas: [{ id: 50 }, { id: 51 }] }])(
    'no cierra ocupación ausente o diferente %j',
    async ({ activas }) => {
      const { caso, sql } = preparar([[fila], activas])
      await expect(caso.ejecutar(liberar)).rejects.toMatchObject({ codigo: 'TRANSICION_INVALIDA' })
      expect(sql).toHaveBeenCalledTimes(2)
    },
  )
  it('no cambia estado cuando ya se cerró la asignación', async () => {
    const { caso, sql } = preparar([[fila], [{ id: 50 }], { affectedRows: 0 }])
    await expect(caso.ejecutar(liberar)).rejects.toMatchObject({ codigo: 'TRANSICION_INVALIDA' })
    expect(sql).toHaveBeenCalledTimes(3)
  })
  it('propaga el fallo de cambio de estado para rollback del cierre', async () => {
    const error = new Error('Fallo de escritura')
    const { caso } = preparar([
      [fila],
      [{ id: 50 }],
      { affectedRows: 1 },
      [{ fecha_egreso: fecha }],
      error,
    ])
    await expect(caso.ejecutar(liberar)).rejects.toBe(error)
  })
  it('propaga el fallo de commit del proveedor', async () => {
    const error = new Error('Commit fallido')
    const caso = new TransicionarCama(
      new MysqlTransicionCamaRepository({
        ejecutar: async () => {
          throw error
        },
      }),
    )
    await expect(caso.ejecutar(liberar)).rejects.toBe(error)
  })
  it.each([null, '2026-11-15', new Date(NaN)])(
    'no confirma con fecha de egreso inválida %j',
    async (fecha_egreso) => {
      const { caso } = preparar([[fila], [{ id: 50 }], { affectedRows: 1 }, [{ fecha_egreso }]])
      await expect(caso.ejecutar(liberar)).rejects.toThrow('fecha de egreso')
    },
  )
  it.each([
    ['confirmar-limpieza', 'En limpieza', 'Libre'],
    ['bloquear', 'Libre', 'Bloqueada'],
    ['bloquear', 'En limpieza', 'Bloqueada'],
    ['finalizar-mantenimiento', 'Bloqueada', 'En limpieza'],
  ] as const)('%s: cambia %s a %s sin tocar el historial', async (accion, origen, destino) => {
    const { caso, sql } = preparar([[{ ...fila, estado: origen }], [], { affectedRows: 1 }])
    expect(
      await caso.ejecutar({ accion, idCama: 101, estadoEsperado: origen, idUsuario: 3 }),
    ).toMatchObject({ estado: destino, fechaEgreso: null, idAsignacionFinalizada: null })
    expect(sql).toHaveBeenCalledTimes(3)
    expect(sql.mock.calls[2]?.[1]).toEqual([destino, 101, origen])
  })
  it('no confirma higiene si queda una ocupación activa inconsistente', async () => {
    const { caso, sql } = preparar([[{ ...fila, estado: 'En limpieza' }], [{ id: 50 }]])
    await expect(
      caso.ejecutar({
        accion: 'confirmar-limpieza',
        idCama: 101,
        estadoEsperado: 'En limpieza',
        idUsuario: 3,
      }),
    ).rejects.toMatchObject({ codigo: 'TRANSICION_INVALIDA' })
    expect(sql).toHaveBeenCalledTimes(2)
  })
  it('no confirma cuando falla el UPDATE condicionado', async () => {
    const { caso } = preparar([[{ ...fila, estado: 'En limpieza' }], [], { affectedRows: 0 }])
    await expect(
      caso.ejecutar({
        accion: 'confirmar-limpieza',
        idCama: 101,
        estadoEsperado: 'En limpieza',
        idUsuario: 3,
      }),
    ).rejects.toMatchObject({ codigo: 'CAMA_NO_DISPONIBLE' })
  })
})
