import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createRequire } from 'node:module'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import type { Express } from 'express'
import { CamasController } from '../../presentation/controlers/CamasController.js'
import { AsignarCama } from '../../application/use-cases/AsignarCama.js'
import type { IConsultaCamas } from '../../application/ports/IConsultaCamas.js'
import { AsignacionCama } from '../../domain/entities/AsignacionCama.js'
import { ErrorRecursosCamas } from '../../domain/errors/ErrorRecursosCamas.js'
import { Cama } from '../../domain/entities/Cama.js'
import { TransicionarCama } from '../../application/use-cases/TransicionarCama.js'
import { InventarioController } from '../../presentation/controlers/InventarioController.js'

const require = createRequire(import.meta.url)
let expressDisponible = false
try {
  require.resolve('express')
  expressDisponible = true
} catch {
  /* Dependencia pendiente explícita. */
}

// Integración HTTP real con puertos de prueba. No acredita concurrencia de MySQL.
describe.skipIf(!expressDisponible)('HTTP Express: HU 1.1 y HU 2.1', () => {
  let server: Server
  let url: string
  beforeAll(async () => {
    const nombreModulo = 'express'
    const express = (await import(/* @vite-ignore */ nombreModulo))
      .default as typeof import('express')
    const { crearRecursosCamasRouter } =
      await import('../../presentation/routes/recursosCamas.routes.js')
    const { crearModuloLecturaRecursosCamas } = await import('../../recursosCamas.module.js')
    const app: Express = express()
    app.use(express.json())
    app.use(
      '/api/lectura-recursos-camas',
      crearModuloLecturaRecursosCamas({
        // Doble sólo de la conexión: los adaptadores y controles HTTP son los reales.
        database: { query: async () => [[], []] },
        obtenerActor: (req) =>
          req.headers.authorization === 'Bearer prueba'
            ? { idUsuario: 7, permisos: ['camas:consultar', 'inventario:consultar'] }
            : undefined,
      }),
    )
    const consultaCamas: IConsultaCamas = { listar: async () => [] }
    const asignar = new AsignarCama(
      {
        async asignarSiDisponible(solicitud, ocupar) {
          if (solicitud.idCama === 2)
            throw new ErrorRecursosCamas('CAMA_NO_DISPONIBLE', 'La cama acaba de ser ocupada.')
          if (solicitud.idCama === 3)
            throw new ErrorRecursosCamas(
              'TRANSACCIONES_NO_DISPONIBLES',
              'Integración transaccional pendiente.',
            )
          ocupar(
            new Cama({
              id: solicitud.idCama,
              estado: 'Libre',
              piso: 2,
              habitacion: 204,
              idTipoCama: 1,
            }),
          )
          return new AsignacionCama(
            1,
            solicitud.idCama,
            solicitud.idPaciente,
            solicitud.idUsuarioAsignador,
            new Date(),
          )
        },
      },
      { existe: async () => true, buscarPorDni: async () => null },
    )
    const transicionar = new TransicionarCama({
      async transicionar(solicitud, aplicar) {
        if (solicitud.idCama === 503)
          throw new ErrorRecursosCamas('TRANSACCIONES_NO_DISPONIBLES', 'Integración pendiente.')
        const estado =
          solicitud.idCama === 101
            ? 'Ocupada'
            : solicitud.idCama === 102
              ? 'En limpieza'
              : solicitud.idCama === 103
                ? 'Bloqueada'
                : 'Libre'
        if (estado !== solicitud.estadoEsperado)
          throw new ErrorRecursosCamas('TRANSICION_INVALIDA', 'El estado cambió.')
        const cama = new Cama({
          id: solicitud.idCama,
          estado,
          piso: 2,
          habitacion: 204,
          idTipoCama: 1,
        })
        aplicar(cama)
        return {
          idCama: cama.id,
          estadoAnterior: estado,
          estado: cama.estado,
          idAsignacionFinalizada: solicitud.accion === 'liberar' ? solicitud.idAsignacion : null,
          fechaEgreso: solicitud.accion === 'liberar' ? new Date() : null,
        }
      },
    })
    app.use(
      '/api/recursos-camas',
      crearRecursosCamasRouter(
        new CamasController(
          consultaCamas,
          asignar,
          (req) => {
            if (req.headers.authorization === 'Bearer prueba')
              return {
                idUsuario: 7,
                permisos: [
                  'camas:consultar',
                  'camas:asignar',
                  'camas:liberar',
                  'camas:limpiar',
                  'camas:mantener',
                ],
              }
            if (req.headers.authorization === 'Bearer sin-permiso')
              return { idUsuario: 7, permisos: [] }
            return undefined
          },
          transicionar,
        ),
        new InventarioController(
          {
            listar: async () => [{ id: 4, nombre: 'Ibuprofeno 400mg', stock: 50, piso: 2 }],
            procesarConsumo: async () => {
              throw new Error('Los consumos no se procesan por HTTP.')
            },
          },
          (req) =>
            req.headers.authorization === 'Bearer prueba'
              ? { idUsuario: 7, permisos: ['inventario:consultar'] }
              : req.headers.authorization === 'Bearer sin-permiso'
                ? { idUsuario: 7, permisos: [] }
                : undefined,
        ),
      ),
    )
    server = createServer(app)
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', resolve)
    })
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/recursos-camas`
  })

  afterAll(async () => {
    if (server)
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      )
  })

  function post(body: unknown, token = 'prueba') {
    return fetch(`${url}/asignaciones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })
  }

  it('201: asigna usando el usuario autenticado', async () => {
    const respuesta = await post({ idCama: 1, idPaciente: 8 })
    expect(respuesta.status).toBe(201)
    expect(await respuesta.json()).toMatchObject({
      asignacion: { idUsuarioAsignador: 7, idPaciente: 8 },
    })
  })
  it('409: comunica el conflicto', async () => {
    expect((await post({ idCama: 2, idPaciente: 8 })).status).toBe(409)
  })
  it('503: no simula la integración transaccional', async () => {
    expect((await post({ idCama: 3, idPaciente: 8 })).status).toBe(503)
  })
  it('400: rechaza el usuario asignador en el body', async () => {
    expect((await post({ idCama: 1, idPaciente: 8, idUsuarioAsignador: 999 })).status).toBe(400)
  })
  it('401: exige identidad autenticada', async () => {
    expect((await post({ idCama: 1, idPaciente: 8 }, 'ausente')).status).toBe(401)
  })
  it('403: exige permiso de asignación', async () => {
    expect((await post({ idCama: 1, idPaciente: 8 }, 'sin-permiso')).status).toBe(403)
  })
  it('200: expone la consulta del mapa', async () => {
    const respuesta = await fetch(`${url}/camas`, { headers: { Authorization: 'Bearer prueba' } })
    expect(respuesta.status).toBe(200)
    expect(await respuesta.json()).toEqual({ camas: [] })
  })

  it('200: consulta el inventario sin disparar consumos', async () => {
    const respuesta = await fetch(`${url}/insumos`, { headers: { Authorization: 'Bearer prueba' } })
    expect(respuesta.status).toBe(200)
    expect(await respuesta.json()).toEqual({
      insumos: [{ id: 4, nombre: 'Ibuprofeno 400mg', stock: 50, piso: 2 }],
    })
  })

  it.each(['camas', 'insumos'])(
    'el montaje de sólo lectura expone GET %s sin Admisión',
    async (recurso) => {
      const respuesta = await fetch(
        url.replace('/api/recursos-camas', `/api/lectura-recursos-camas/${recurso}`),
        {
          headers: { Authorization: 'Bearer prueba' },
        },
      )
      expect(respuesta.status).toBe(200)
      expect(await respuesta.json()).toEqual({ [recurso]: [] })
    },
  )
  it('el montaje de sólo lectura sigue exigiendo identidad', async () => {
    expect(
      (await fetch(url.replace('/api/recursos-camas', '/api/lectura-recursos-camas/camas'))).status,
    ).toBe(401)
  })
  it('el montaje de sólo lectura no registra POST de asignación', async () => {
    expect(
      (
        await fetch(
          url.replace('/api/recursos-camas', '/api/lectura-recursos-camas/asignaciones'),
          {
            method: 'POST',
            headers: { Authorization: 'Bearer prueba' },
          },
        )
      ).status,
    ).toBe(404)
  })
  it('401: protege el inventario sin identidad', async () => {
    expect((await fetch(`${url}/insumos`)).status).toBe(401)
  })
  it('403: exige permiso de consulta de inventario', async () => {
    expect(
      (await fetch(`${url}/insumos`, { headers: { Authorization: 'Bearer sin-permiso' } })).status,
    ).toBe(403)
  })
  it('no expone una ruta pública para descontar stock', async () => {
    expect(
      (
        await fetch(`${url}/insumos`, {
          method: 'POST',
          headers: { Authorization: 'Bearer prueba' },
        })
      ).status,
    ).toBe(404)
  })

  function cambiar(idCama: number, ruta: string, body: unknown, token = 'prueba') {
    return fetch(`${url}/camas/${idCama}/${ruta}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })
  }
  it('200: liberación por alta termina en limpieza', async () => {
    const respuesta = await cambiar(101, 'liberacion', {
      estadoEsperado: 'Ocupada',
      idAsignacion: 50,
      motivo: 'alta',
    })
    expect(respuesta.status).toBe(200)
    expect(await respuesta.json()).toMatchObject({
      transicion: { estado: 'En limpieza', idAsignacionFinalizada: 50 },
    })
  })
  it.each([
    [102, 'confirmacion-limpieza', 'En limpieza', 'Libre'],
    [104, 'bloqueo', 'Libre', 'Bloqueada'],
    [103, 'fin-mantenimiento', 'Bloqueada', 'En limpieza'],
  ])('200: %s/%s', async (id, ruta, origen, destino) => {
    const respuesta = await cambiar(Number(id), String(ruta), { estadoEsperado: origen })
    expect(respuesta.status).toBe(200)
    expect(await respuesta.json()).toMatchObject({ transicion: { estado: destino } })
  })
  it('409: no confirma limpieza de una cama ocupada', async () => {
    expect(
      (await cambiar(101, 'confirmacion-limpieza', { estadoEsperado: 'Ocupada' })).status,
    ).toBe(409)
  })
  it('409: rechaza estado obsoleto', async () => {
    expect((await cambiar(102, 'bloqueo', { estadoEsperado: 'Libre' })).status).toBe(409)
  })
  it('400: no acepta elegir Libre como destino', async () => {
    expect(
      (
        await cambiar(101, 'liberacion', {
          estadoEsperado: 'Ocupada',
          idAsignacion: 50,
          motivo: 'alta',
          estado: 'Libre',
        })
      ).status,
    ).toBe(400)
  })
  it('403: protege los permisos de higiene', async () => {
    expect(
      (
        await cambiar(
          102,
          'confirmacion-limpieza',
          { estadoEsperado: 'En limpieza' },
          'sin-permiso',
        )
      ).status,
    ).toBe(403)
  })
  it('401: exige identidad para mantenimiento', async () => {
    expect(
      (await cambiar(103, 'fin-mantenimiento', { estadoEsperado: 'Bloqueada' }, 'ausente')).status,
    ).toBe(401)
  })
  it('503: informa proveedor ausente también en higiene', async () => {
    expect(
      (await cambiar(503, 'confirmacion-limpieza', { estadoEsperado: 'En limpieza' })).status,
    ).toBe(503)
  })
})
