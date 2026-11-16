import { describe, expect, it, vi } from 'vitest'
import { Cama } from '../../domain/entities/Cama.js'
import type { EstadoCamaNombre } from '../../domain/states/EstadoCama.js'
import { TransicionarCama } from '../../application/use-cases/TransicionarCama.js'
import type {
  AccionCama,
  SolicitudTransicionCama,
} from '../../domain/repositories/ITransicionCamaRepository.js'
import { validarTransicion } from '../../presentation/validators/transicionValidator.js'

const estados: EstadoCamaNombre[] = ['Libre', 'Ocupada', 'En limpieza', 'Bloqueada']
const acciones = [
  'ocupar',
  'liberar',
  'confirmarLimpieza',
  'bloquear',
  'finalizarMantenimiento',
] as const
const permitidas: {
  origen: EstadoCamaNombre
  accion: (typeof acciones)[number]
  destino: EstadoCamaNombre
}[] = [
  { origen: 'Libre', accion: 'ocupar', destino: 'Ocupada' },
  { origen: 'Libre', accion: 'bloquear', destino: 'Bloqueada' },
  { origen: 'Ocupada', accion: 'liberar', destino: 'En limpieza' },
  { origen: 'En limpieza', accion: 'confirmarLimpieza', destino: 'Libre' },
  { origen: 'En limpieza', accion: 'bloquear', destino: 'Bloqueada' },
  { origen: 'Bloqueada', accion: 'finalizarMantenimiento', destino: 'En limpieza' },
]
function crearCama(estado: EstadoCamaNombre) {
  return new Cama({ id: 101, estado, piso: 2, habitacion: 204, idTipoCama: 1 })
}

describe('HU 2.1: matriz completa State', () => {
  for (const estado of estados) {
    for (const accion of acciones) {
      it(`${estado}: ${accion}`, () => {
        const cama = crearCama(estado)
        const destino = permitidas.find(
          (transicion) => transicion.origen === estado && transicion.accion === accion,
        )?.destino
        if (destino) {
          cama[accion]()
          expect(cama.estado).toBe(destino)
        } else {
          expect(() => cama[accion]()).toThrow()
          expect(cama.estado).toBe(estado)
        }
      })
    }
  }
  it('requiere higiene tras alta y tras mantenimiento antes de volver a ocupar', () => {
    const cama = crearCama('Ocupada')
    cama.liberar()
    expect(() => cama.ocupar()).toThrow()
    cama.bloquear()
    expect(() => cama.ocupar()).toThrow()
    cama.finalizarMantenimiento()
    expect(() => cama.ocupar()).toThrow()
    cama.confirmarLimpieza()
    cama.ocupar()
    expect(cama.estado).toBe('Ocupada')
  })
})

describe('HU 2.1: comandos de aplicación', () => {
  const ejemplos: SolicitudTransicionCama[] = [
    { accion: 'liberar', idCama: 101, estadoEsperado: 'Ocupada', idAsignacion: 50, motivo: 'alta' },
    {
      accion: 'liberar',
      idCama: 101,
      estadoEsperado: 'Ocupada',
      idAsignacion: 50,
      motivo: 'traslado',
    },
    { accion: 'confirmar-limpieza', idCama: 101, estadoEsperado: 'En limpieza' },
    { accion: 'bloquear', idCama: 101, estadoEsperado: 'Libre' },
    { accion: 'finalizar-mantenimiento', idCama: 101, estadoEsperado: 'Bloqueada' },
  ]
  it.each(ejemplos)(
    'ejecuta $accion sobre la entidad leída por el repositorio',
    async (solicitud) => {
      const transicionar = vi.fn(async (_solicitud, aplicar: (cama: Cama) => void) => {
        const cama = crearCama(solicitud.estadoEsperado)
        aplicar(cama)
        return {
          idCama: cama.id,
          estadoAnterior: solicitud.estadoEsperado,
          estado: cama.estado,
          idAsignacionFinalizada: solicitud.accion === 'liberar' ? 50 : null,
          fechaEgreso: solicitud.accion === 'liberar' ? new Date('2026-11-15T13:00:00Z') : null,
        }
      })
      const resultado = await new TransicionarCama({ transicionar }).ejecutar({
        ...solicitud,
        idUsuario: 3,
      })
      expect(transicionar).toHaveBeenCalledOnce()
      expect(resultado.estado).not.toBe(solicitud.estadoEsperado)
      expect(resultado.fechaEgreso).toBe(
        solicitud.accion === 'liberar' ? '2026-11-15T13:00:00.000Z' : null,
      )
    },
  )
  it.each([
    { idCama: 0 },
    { idUsuario: -1 },
    { idAsignacion: 0 },
    { motivo: 'cancelacion' },
    { estadoEsperado: 'Sucia' },
  ])('rechaza entradas inválidas antes de persistir %j', async (reemplazo) => {
    const transicionar = vi.fn()
    const solicitud = {
      accion: 'liberar',
      idCama: 101,
      idUsuario: 3,
      idAsignacion: 50,
      estadoEsperado: 'Ocupada',
      motivo: 'alta',
      ...reemplazo,
    }
    await expect(
      new TransicionarCama({ transicionar }).ejecutar(
        solicitud as Parameters<TransicionarCama['ejecutar']>[0],
      ),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' })
    expect(transicionar).not.toHaveBeenCalled()
  })
})

describe('validación HTTP de transiciones', () => {
  it('requiere asignación activa y motivo al liberar', () => {
    expect(
      validarTransicion('liberar', '101', {
        estadoEsperado: 'Ocupada',
        idAsignacion: 50,
        motivo: 'alta',
      }),
    ).toMatchObject({ idCama: 101, idAsignacion: 50, accion: 'liberar' })
  })
  it.each<AccionCama>(['confirmar-limpieza', 'bloquear', 'finalizar-mantenimiento'])(
    'acepta %s',
    (accion) => {
      expect(validarTransicion(accion, '101', { estadoEsperado: 'En limpieza' }).accion).toBe(
        accion,
      )
    },
  )
  it.each(['0', '-1', '1.2', '1e2', '101abc', '2147483648', ['101']])(
    'rechaza parámetro %j',
    (id) => {
      expect(() => validarTransicion('bloquear', id, { estadoEsperado: 'Libre' })).toThrow()
    },
  )
  it.each([
    null,
    [],
    {},
    { estadoEsperado: 'Libre', estado: 'Ocupada' },
    { estadoEsperado: 'Libre', idUsuario: 99 },
    { estadoEsperado: 'libres' },
  ])('rechaza body %j', (body) => {
    expect(() => validarTransicion('bloquear', '101', body)).toThrow()
  })
  it.each([
    { estadoEsperado: 'Ocupada' },
    { estadoEsperado: 'Ocupada', idAsignacion: '50', motivo: 'alta' },
    { estadoEsperado: 'Ocupada', idAsignacion: 50, motivo: 'otro' },
  ])('no libera sin contrato completo %j', (body) => {
    expect(() => validarTransicion('liberar', '101', body)).toThrow()
  })
})
