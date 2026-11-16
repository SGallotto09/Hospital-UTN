import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AdministracionMedicacionRepositoryMysq } from '../../../atencion-enfermeria/infraestructure/repositories/administracion_medicacion_repository_mysql.js'
import { AdministrarMedicacion } from '../../../atencion-enfermeria/use-cases/administracion-medicacion/administrar_medicacion.js'
import { Database } from '../../../../database/connectionDB.js'
import { crearProveedorTransacciones } from '../../infraestructure/database/ContratosMysql.js'
import { crearRegistroConsumosMysql } from '../../infraestructure/database/RegistroConsumosMysql.js'
import { MysqlInsumoRepository } from '../../infraestructure/repositories/MysqlInsumoRepository.js'
import { ConsultaMysqlCompartida } from '../../infraestructure/database/ConsultaMysqlCompartida.js'
import { ProcesarConsumoInsumo } from '../../application/use-cases/ProcesarConsumoInsumo.js'

// Componentes reales con conexiones programadas: no ejecuta escrituras en MySQL.
const mocks = vi.hoisted(() => ({
  conexion: {
    beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn(),
    destroy: vi.fn(), execute: vi.fn(),
  },
  pool: { getConnection: vi.fn(), execute: vi.fn() },
}))
vi.mock('mysql2/promise', () => ({ default: { createPool: () => mocks.pool } }))

const horario = new Date('2026-11-16T10:00:00')
const indicacion = {
  id_insumo: 4, cantidad: 1, id_paciente: 8,
  fecha: '2026-11-16', hora_inicio: '10:00:00', frecuencia_horas: 8,
}
const evento = {
  tipo: 'MedicacionAdministrada', version: 1, idEvento: 'medicacion:20',
  idAdministracion: 20, idInsumo: 4, cantidad: 1, piso: 2,
}
const filaConsumo = { id_insumo: 4, cantidad: 1, piso: 2, estado: 'pendiente' }
const insumo = { id: 4, nombre: 'Ibuprofeno', stock: 50, piso: 2 }

function responder(...resultados: unknown[]) {
  for (const resultado of resultados) {
    if (resultado instanceof Error) mocks.conexion.execute.mockRejectedValueOnce(resultado)
    else mocks.conexion.execute.mockResolvedValueOnce([resultado, []])
  }
}
function consumidor() {
  const db = Database.getInstance()
  return new ProcesarConsumoInsumo(new MysqlInsumoRepository(
    new ConsultaMysqlCompartida(db), crearProveedorTransacciones(db), crearRegistroConsumosMysql(),
  ))
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(horario)
  mocks.pool.getConnection.mockResolvedValue(mocks.conexion)
})
afterEach(() => vi.useRealTimers())

describe('Enfermería: administración y pendiente atómicos', () => {
  it('bloquea indicación y dosis, toma el piso activo e inserta todo sin descontar stock', async () => {
    responder([indicacion], [], [{ piso: 2 }], { insertId: 20 }, { affectedRows: 1 })
    await new AdministracionMedicacionRepositoryMysq().administrar(1, 7, horario, horario)
    const llamadas = mocks.conexion.execute.mock.calls
    expect(llamadas[0]?.[0]).toContain('FROM indicacion_medica WHERE id = ? FOR UPDATE')
    expect(llamadas[1]?.[0]).toContain('FOR UPDATE')
    expect(llamadas[1]?.[1]).toEqual([1, horario, horario])
    expect(llamadas[2]?.[0]).toContain('ac.fecha_egreso IS NULL')
    expect(llamadas[4]?.[0]).toContain('INSERT INTO consumos_medicacion')
    expect(llamadas[4]?.[1]).toEqual([20, 4, 1, 2])
    expect(llamadas.some(([sql]) => /UPDATE\s+insumos/i.test(sql))).toBe(false)
    expect(mocks.pool.execute).not.toHaveBeenCalled()
    expect(mocks.conexion.commit).toHaveBeenCalledOnce()
    expect(mocks.conexion.release).toHaveBeenCalledOnce()
  })

  it.each(['administracion', 'consumo'])('revierte ambas inserciones si falla %s', async etapa => {
    const error = new Error('inserción fallida')
    responder([indicacion], [], [{ piso: 2 }])
    if (etapa === 'consumo') responder({ insertId: 20 })
    responder(error)
    await expect(new AdministracionMedicacionRepositoryMysq().administrar(1, 7, horario, horario)).rejects.toBe(error)
    expect(mocks.conexion.rollback).toHaveBeenCalledOnce()
    expect(mocks.conexion.commit).not.toHaveBeenCalled()
    expect(mocks.conexion.release).toHaveBeenCalledOnce()
  })

  it('recomprueba la dosis con lectura bloqueada y rechaza una administración ya confirmada', async () => {
    responder([indicacion], [{ id: 20 }])
    await expect(new AdministracionMedicacionRepositoryMysq().administrar(1, 7, horario, horario))
      .rejects.toThrow('Esta dosis ya fue administrada')
    expect(mocks.conexion.execute).toHaveBeenCalledTimes(2)
    expect(mocks.conexion.rollback).toHaveBeenCalledOnce()
  })

  it('no registra si el paciente no tiene cama activa', async () => {
    responder([indicacion], [], [])
    await expect(new AdministracionMedicacionRepositoryMysq().administrar(1, 7, horario, horario))
      .rejects.toThrow('única cama activa')
    expect(mocks.conexion.execute).toHaveBeenCalledTimes(3)
    expect(mocks.conexion.commit).not.toHaveBeenCalled()
  })

  it.each([0, -1, 1.5])('rechaza cantidad inválida %s sin insertar', async cantidad => {
    responder([{ ...indicacion, cantidad }])
    await expect(new AdministracionMedicacionRepositoryMysq().administrar(1, 7, horario, horario))
      .rejects.toThrow('unidades positivas')
    expect(mocks.conexion.execute).toHaveBeenCalledTimes(1)
  })

  it('conserva el caso de uso clínico y transmite el horario programado', async () => {
    const repo = {
      obtenerTodas: vi.fn(), obtenerDatosIndicacion: vi.fn().mockResolvedValue(indicacion),
      existeDosisAdministrada: vi.fn().mockResolvedValue(false), administrar: vi.fn(),
    }
    await new AdministrarMedicacion(repo).ejecutar(1, 7, horario)
    expect(repo.administrar).toHaveBeenCalledWith(1, 7, horario, horario)
    await expect(new AdministrarMedicacion(repo).ejecutar(1, 7, new Date(horario.getTime() + 3600000)))
      .rejects.toThrow('dosis programada')
  })
})

describe('Recursos y Camas: consumo persistente y stock atómicos', () => {
  it('bloquea el pendiente, registra el procesamiento y descuenta 50 a 49 en la misma conexión', async () => {
    responder([filaConsumo], { affectedRows: 1 }, [insumo], { affectedRows: 1 })
    await expect(consumidor().ejecutar(evento)).resolves.toMatchObject({ estado: 'descontado', stockRestante: 49 })
    expect(mocks.conexion.execute.mock.calls[0]?.[0]).toContain('FOR UPDATE')
    expect(mocks.conexion.execute.mock.calls[1]?.[0]).toContain("estado = 'procesado'")
    expect(mocks.conexion.execute.mock.calls[3]?.[1]).toEqual([1, 4, 2, 1])
    expect(mocks.conexion.commit).toHaveBeenCalledOnce()
    expect(mocks.pool.execute).not.toHaveBeenCalled()
  })

  it('no descuenta un consumo procesado aunque se vuelva a entregar', async () => {
    responder([{ ...filaConsumo, estado: 'procesado' }])
    await expect(consumidor().ejecutar(evento)).resolves.toMatchObject({ estado: 'duplicado', cantidadDescontada: 0 })
    expect(mocks.conexion.execute).toHaveBeenCalledTimes(1)
  })

  it.each(['revision', 'ausente', 'cantidad', 'evento'])('no escribe ante consumo %s', async caso => {
    if (caso !== 'evento') responder(caso === 'ausente' ? [] : [{ ...filaConsumo, ...(caso === 'cantidad' ? { cantidad: 2 } : { estado: 'revision' }) }])
    await expect(consumidor().ejecutar({ ...evento, ...(caso === 'evento' ? { idEvento: 'otro-evento' } : {}) }))
      .rejects.toMatchObject({ codigo: 'CONSUMO_INCONSISTENTE' })
    expect(mocks.conexion.commit).not.toHaveBeenCalled()
    expect(mocks.conexion.rollback).toHaveBeenCalledOnce()
    expect(mocks.conexion.execute.mock.calls.some(([sql]) => sql.startsWith('UPDATE'))).toBe(false)
  })

  it.each([
    [{ ...insumo, stock: 0 }, 'STOCK_INSUFICIENTE'],
    [{ ...insumo, piso: 3 }, 'PISO_INSUMO_INVALIDO'],
  ])('revierte la marca si el insumo no permite descontar: %j', async (fila, codigo) => {
    responder([filaConsumo], { affectedRows: 1 }, [fila])
    await expect(consumidor().ejecutar(evento)).rejects.toMatchObject({ codigo })
    expect(mocks.conexion.rollback).toHaveBeenCalledOnce()
    expect(mocks.conexion.commit).not.toHaveBeenCalled()
    expect(mocks.conexion.execute).toHaveBeenCalledTimes(3)
  })

  it('un fallo después de marcar permite reintentar y después deduplicar', async () => {
    const fallo = new Error('fallo transitorio')
    responder([filaConsumo], { affectedRows: 1 }, [insumo], fallo)
    await expect(consumidor().ejecutar(evento)).rejects.toBe(fallo)
    expect(mocks.conexion.rollback).toHaveBeenCalledOnce()
    // El doble representa la fila pendiente que dejó el rollback; no simula aislamiento real.
    responder([filaConsumo], { affectedRows: 1 }, [insumo], { affectedRows: 1 })
    await expect(consumidor().ejecutar(evento)).resolves.toMatchObject({ estado: 'descontado' })
    responder([{ ...filaConsumo, estado: 'procesado' }])
    await expect(consumidor().ejecutar(evento)).resolves.toMatchObject({ estado: 'duplicado' })
  })
})
