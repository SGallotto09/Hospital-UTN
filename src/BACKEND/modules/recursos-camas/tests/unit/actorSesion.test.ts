import { describe, expect, it } from 'vitest'
import type { Request } from 'express'
import { crearObtenerActorDesdeSesion } from '../../infraestructure/api/obtenerActorSesion.js'

function peticion(session: unknown): Request {
  return { session } as Request
}

describe('adaptación de la sesión IAM', () => {
  it('no concede permisos por defecto, tampoco a Administrador', () => {
    const obtenerActor = crearObtenerActorDesdeSesion()
    expect(obtenerActor(peticion({ usuarioId: 7, rol: 'Administrador' }))).toEqual({
      idUsuario: 7,
      permisos: [],
    })
  })
  it.each(['Administrador', 'Médico', 'Enfermero', 'Recepcionista', 'Limpieza'])(
    'lee el rol real %s con una política explícita de prueba',
    (rol) => {
      const obtenerActor = crearObtenerActorDesdeSesion({ [rol]: ['camas:consultar'] })
      expect(obtenerActor(peticion({ usuarioId: 7, rol }))).toEqual({
        idUsuario: 7,
        permisos: ['camas:consultar'],
      })
    },
  )
  it.each([
    undefined,
    {},
    { usuarioId: 7 },
    { rol: 'Enfermero' },
    { usuarioId: 0, rol: 'Enfermero' },
    { usuarioId: -1, rol: 'Enfermero' },
    { usuarioId: 1.5, rol: 'Enfermero' },
    { usuarioId: '7', rol: 'Enfermero' },
    { usuarioId: 2147483648, rol: 'Enfermero' },
    { usuarioId: 7, rol: '' },
  ])('rechaza una sesión incompleta o inválida %j', (session) => {
    expect(crearObtenerActorDesdeSesion()(peticion(session))).toBeUndefined()
  })
  it.each(['Medico', 'médico', 'Visitante', 'toString'])(
    'no reconoce alias, roles inventados ni claves heredadas: %s',
    (rol) => {
      const obtenerActor = crearObtenerActorDesdeSesion({ [rol]: ['camas:consultar'] })
      expect(obtenerActor(peticion({ usuarioId: 7, rol }))).toEqual({ idUsuario: 7, permisos: [] })
    },
  )
  it('no toma identidad ni permisos del body o de headers', () => {
    const req = {
      body: { usuarioId: 7, rol: 'Administrador', permisos: ['camas:asignar'] },
      headers: { 'x-usuario-id': '7', 'x-rol': 'Administrador' },
    } as unknown as Request
    expect(crearObtenerActorDesdeSesion({ Administrador: ['camas:asignar'] })(req)).toBeUndefined()
  })
  it('no permite modificar la política a través del actor devuelto', () => {
    const permisos = ['camas:consultar']
    const obtenerActor = crearObtenerActorDesdeSesion({ Enfermero: permisos })
    const req = peticion({ usuarioId: 7, rol: 'Enfermero' })
    const actor = obtenerActor(req)!
    expect(actor.permisos).not.toBe(permisos)
    expect(obtenerActor(req)?.permisos).toEqual(['camas:consultar'])
  })
})
