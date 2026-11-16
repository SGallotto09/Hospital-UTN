import { describe, expect, it, vi } from 'vitest'
import { Cama } from '../../domain/entities/Cama.js'
import { AsignacionCama } from '../../domain/entities/AsignacionCama.js'
import { AsignarCama } from '../../application/use-cases/AsignarCama.js'
import { validarAsignacion } from '../../presentation/validators/asignacionValidator.js'
import { mapearEstado } from '../../infraestructure/mappers/CamaMapper.js'
import type { EstadoCamaNombre } from '../../domain/states/EstadoCama.js'

const crearCama = (estado: EstadoCamaNombre = 'Libre') =>
  new Cama({
    id: 101,
    estado,
    habitacion: 204,
    piso: 2,
    idTipoCama: 1,
  })
const solicitud = { idCama: 101, idPaciente: 8, idUsuarioAsignador: 3 }

describe('HU 1.1: dominio y aplicación', () => {
  it('ocupa una cama libre mediante State', () => {
    const cama = crearCama()
    cama.ocupar()
    expect(cama.estado).toBe('Ocupada')
  })

  it.each<EstadoCamaNombre>(['Ocupada', 'En limpieza', 'Bloqueada'])(
    'rechaza asignar desde %s y conserva el estado',
    (estado) => {
      const cama = crearCama(estado)
      expect(() => cama.ocupar()).toThrow()
      expect(cama.estado).toBe(estado)
    },
  )

  it('rechaza una segunda ocupación de la misma entidad', () => {
    const cama = crearCama()
    cama.ocupar()
    expect(() => cama.ocupar()).toThrow()
  })

  it('conserva la fecha de ingreso ante mutaciones externas', () => {
    const fecha = new Date('2026-11-15T12:00:00Z')
    const asignacion = new AsignacionCama(1, 101, 8, 3, fecha)
    fecha.setFullYear(2000)
    asignacion.fechaIngreso.setFullYear(2001)
    expect(asignacion.fechaIngreso.toISOString()).toBe('2026-11-15T12:00:00.000Z')
  })

  it('invoca la regla dentro de la operación atómica del repositorio', async () => {
    const cama = crearCama()
    const asignarSiDisponible = vi.fn(async (_solicitud, ocupar: (cama: Cama) => void) => {
      ocupar(cama)
      return new AsignacionCama(1, 101, 8, 3, new Date('2026-11-15T12:00:00Z'))
    })
    const caso = new AsignarCama({ asignarSiDisponible }, { existe: async () => true, buscarPorDni: async () => null })
    expect(await caso.ejecutar(solicitud)).toMatchObject({ id: 1, idCama: 101, idPaciente: 8 })
    expect(cama.estado).toBe('Ocupada')
    expect(asignarSiDisponible).toHaveBeenCalledOnce()
  })

  it('no persiste un paciente inexistente', async () => {
    const asignarSiDisponible = vi.fn()
    const caso = new AsignarCama({ asignarSiDisponible }, { existe: async () => false, buscarPorDni: async () => null })
    await expect(caso.ejecutar(solicitud)).rejects.toMatchObject({
      codigo: 'PACIENTE_NO_ENCONTRADO',
    })
    expect(asignarSiDisponible).not.toHaveBeenCalled()
  })

  it.each([0, -1, 1.5, NaN, Infinity, 2147483648])(
    'rechaza id inválido %s antes de consultar',
    async (id) => {
      const existe = vi.fn()
      const caso = new AsignarCama({ asignarSiDisponible: vi.fn() }, { existe, buscarPorDni: async () => null })
      await expect(caso.ejecutar({ ...solicitud, idCama: id })).rejects.toMatchObject({
        codigo: 'DATOS_INVALIDOS',
      })
      expect(existe).not.toHaveBeenCalled()
    },
  )
})

describe('límite HTTP y compatibilidad de estados', () => {
  it('valida el contrato público', () => {
    expect(validarAsignacion({ idCama: 101, idPaciente: 8 })).toEqual({
      idCama: 101,
      idPaciente: 8,
    })
  })
  it.each([
    null,
    [],
    {},
    { idCama: '101', idPaciente: 8 },
    { idCama: 101, idPaciente: 8, idUsuarioAsignador: 999 },
    { idCama: 101, idPaciente: 0 },
  ])('rechaza entrada inválida o suplantación: %j', (datos) => {
    expect(() => validarAsignacion(datos)).toThrow()
  })
  it.each([
    ['libres', 'Libre'],
    [' OCUPADAS ', 'Ocupada'],
    ['en limpieza', 'En limpieza'],
    ['bloqueadas', 'Bloqueada'],
  ])('normaliza %s', (persistido, dominio) => {
    expect(mapearEstado(persistido)).toBe(dominio)
  })
  it('no convierte estados desconocidos en disponibles', () => {
    expect(() => mapearEstado('desconocido')).toThrow()
  })
})
