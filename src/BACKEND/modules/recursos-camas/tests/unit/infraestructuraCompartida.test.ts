import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Request } from 'express'
import { crearObtenerActorDesdeSesion, permisosRecursosCamasPorRol } from '../../infraestructure/api/obtenerActorSesion.js'
import { RegistrarUsuario } from '../../../IAM/use-cases/RegistrarUsuario.js'
import { MysqlAsignacionCamaRepository } from '../../infraestructure/repositories/MysqlAsignacionCamaRepository.js'
import { crearProveedorTransacciones } from '../../infraestructure/database/ContratosMysql.js'

const mocks = vi.hoisted(() => {
  const conexion = {
    beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(),
    release: vi.fn(), destroy: vi.fn(), ping: vi.fn(), execute: vi.fn(),
  }
  return { conexion, pool: { getConnection: vi.fn(), execute: vi.fn(), end: vi.fn() } }
})
vi.mock('mysql2/promise', () => ({ default: { createPool: () => mocks.pool } }))
import { Database } from '../../../../database/connectionDB.js'

describe('pool compartido', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.pool.getConnection.mockResolvedValue(mocks.conexion)
  })
  it('conserva Singleton y query sobre el pool', async () => {
    const db = Database.getInstance()
    expect(Database.getInstance()).toBe(db)
    mocks.pool.execute.mockResolvedValue([[], []])
    await expect(db.query('SELECT ?', [1])).resolves.toEqual([[], []])
    expect(mocks.pool.execute).toHaveBeenCalledWith('SELECT ?', [1])
  })
  it('usa una conexión exclusiva por transacción concurrente', async () => {
    const segunda = { ...mocks.conexion, release: vi.fn() }
    mocks.pool.getConnection.mockReset().mockResolvedValueOnce(mocks.conexion).mockResolvedValueOnce(segunda)
    const conexiones = await Promise.all([
      Database.getInstance().withTransaction(async c => c),
      Database.getInstance().withTransaction(async c => c),
    ])
    expect(conexiones).toEqual([mocks.conexion, segunda])
    expect(conexiones[0]).not.toBe(conexiones[1])
    expect(mocks.conexion.release).toHaveBeenCalledOnce()
    expect(segunda.release).toHaveBeenCalledOnce()
  })
  it('confirma el resultado y libera la conexión', async () => {
    await expect(Database.getInstance().withTransaction(async () => 42)).resolves.toBe(42)
    expect(mocks.conexion.beginTransaction).toHaveBeenCalledOnce()
    expect(mocks.conexion.commit).toHaveBeenCalledOnce()
    expect(mocks.conexion.rollback).not.toHaveBeenCalled()
    expect(mocks.conexion.release).toHaveBeenCalledOnce()
  })
  it.each(['callback', 'commit', 'beginTransaction'])('revierte ante fallo en %s', async etapa => {
    const error = new Error('fallo controlado')
    if (etapa === 'commit') mocks.conexion.commit.mockRejectedValue(error)
    if (etapa === 'beginTransaction') mocks.conexion.beginTransaction.mockRejectedValue(error)
    await expect(Database.getInstance().withTransaction(async () => {
      if (etapa === 'callback') throw error
    })).rejects.toBe(error)
    expect(mocks.conexion.rollback).toHaveBeenCalledOnce()
    expect(mocks.conexion.release).toHaveBeenCalledOnce()
  })
  it('descarta la conexión si falla rollback', async () => {
    mocks.conexion.rollback.mockRejectedValue(new Error('rollback'))
    await expect(Database.getInstance().withTransaction(async () => { throw new Error('operación') })).rejects.toBeInstanceOf(AggregateError)
    expect(mocks.conexion.destroy).toHaveBeenCalledOnce()
    expect(mocks.conexion.release).not.toHaveBeenCalled()
  })

  it.each([
    ['uq_cama_activa', 'CAMA_NO_DISPONIBLE'],
    ['uq_paciente_activo', 'PACIENTE_YA_ASIGNADO'],
  ])('revierte también el cambio de estado ante %s', async (indice, codigo) => {
    mocks.conexion.execute.mockResolvedValueOnce([[{
      id: 1, estado: 'Libre', piso: 1, habitacion: 101, id_tipo_cama: 1,
    }], []]).mockResolvedValueOnce([[], []])
      .mockResolvedValueOnce([{ affectedRows: 1 }, []])
      .mockRejectedValueOnce(Object.assign(new Error(`Duplicate entry for key '${indice}'`), { code: 'ER_DUP_ENTRY' }))
    const repo = new MysqlAsignacionCamaRepository(crearProveedorTransacciones(Database.getInstance()))
    await expect(repo.asignarSiDisponible({ idCama: 1, idPaciente: 8, idUsuarioAsignador: 7 }, cama => cama.ocupar()))
      .rejects.toMatchObject({ codigo })
    expect(mocks.conexion.execute.mock.calls[2]?.[0]).toContain('UPDATE camas')
    expect(mocks.conexion.rollback).toHaveBeenCalledOnce()
    expect(mocks.conexion.commit).not.toHaveBeenCalled()
    expect(mocks.conexion.release).toHaveBeenCalledOnce()
  })
  it('libera la conexión incluso si falla ping', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.conexion.ping.mockRejectedValue(new Error('ping'))
    await expect(Database.getInstance().probarConexion()).resolves.toBe(false)
    expect(mocks.conexion.release).toHaveBeenCalledOnce()
    log.mockRestore()
  })
})

describe('roles aprobados y registro IAM', () => {
  it.each([
    ['Limpieza', ['camas:consultar', 'camas:limpiar']],
    ['Recepcionista', ['camas:consultar', 'camas:asignar', 'camas:liberar']],
    ['Médico', ['camas:consultar']],
    ['Enfermero', ['camas:consultar', 'inventario:consultar']],
    ['Administrador', ['camas:consultar', 'camas:crear', 'camas:asignar', 'camas:liberar', 'camas:limpiar', 'camas:mantener', 'inventario:consultar']],
  ])('permisos exactos de %s', (rol, permisos) => {
    const req = { session: { usuarioId: 1, rol } } as Request
    expect(crearObtenerActorDesdeSesion(permisosRecursosCamasPorRol)(req)?.permisos).toEqual(permisos)
  })
  it.each(['Limpieza', 'Administrador', 'NoExiste'])('validación de registro: %s', async rol => {
    const repo = {
      buscarPorUsuario: vi.fn().mockResolvedValue(null),
      buscarPorId: vi.fn().mockResolvedValue(null),
      guardar: vi.fn().mockImplementation(async usuario => usuario),
    }
    const caso = new RegistrarUsuario(repo, { hashear: async () => 'hash-solo-de-prueba' })
    const resultado = caso.ejecutar({ nombre: 'Prueba', apellido: 'Prueba', dni: '1', email: 'test@example.test', usuario: 'test', contrasenia: 'test', rol })
    if (rol === 'NoExiste') {
      await expect(resultado).rejects.toThrow()
      expect(repo.guardar).not.toHaveBeenCalled()
    } else {
      await expect(resultado).resolves.toMatchObject({ rol })
    }
  })
})
