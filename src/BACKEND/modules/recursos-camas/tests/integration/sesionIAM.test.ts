import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRequire } from 'node:module'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import type { Request, Response } from 'express'
import { crearObtenerActorDesdeSesion, permisosRecursosCamasPorRol } from '../../infraestructure/api/obtenerActorSesion.js'

const require = createRequire(import.meta.url)
let dependenciasDisponibles = false
try {
  require.resolve('express')
  require.resolve('express-session')
  dependenciasDisponibles = true
} catch {
  /* Dependencias del main pendientes de instalar. */
}

describe.skipIf(!dependenciasDisponibles)(
  'sesiones reales y middleware IAM con Recursos y Camas',
  () => {
    let server: Server
    let url: string
    const query = vi.fn().mockResolvedValue([[], []])
    const execute = vi.fn()
    const ejecutar = vi.fn()
    const registrar = vi.fn(async (_req: Request, res: Response) => { res.sendStatus(201) })

    beforeAll(async () => {
      const nombreExpress = 'express'
      const nombreSession = 'express-session'
      const express = (await import(/* @vite-ignore */ nombreExpress))
        .default as typeof import('express')
      const session = (await import(/* @vite-ignore */ nombreSession))
        .default as typeof import('express-session')
      const { verificarSesion } =
        await import('../../../IAM/infraestructure/middlewares/verificarSesion.js')
      const { crearModuloLecturaRecursosCamas, crearModuloRecursosCamas } = await import('../../recursosCamas.module.js')
      const { RegistroRoutes } = await import('../../../IAM/infraestructure/api/RegistroRoutes.js')
      const { RegistroController } = await import('../../../IAM/infraestructure/api/RegistroController.js')
      const app = express()
      app.use(express.json())
      app.use(
        session({
          secret: 'secreto-exclusivo-de-pruebas',
          resave: false,
          saveUninitialized: false,
        }),
      )
      // Fixture exclusiva de este test: crea cookies de sesión reales sin usuarios ni escrituras en MySQL.
      // No se exporta ni se incorpora al servidor productivo; no sustituye el login de IAM.
      app.post('/sesion-prueba', (req, res) => {
        req.session.usuarioId = req.body.usuarioId
        req.session.rol = req.body.rol
        res.sendStatus(204)
      })
      const registro = Object.create(RegistroController.prototype) as InstanceType<typeof RegistroController>
      registro.registrar = registrar
      app.use('/api/auth', new RegistroRoutes(registro).obtenerRouter())
      app.use('/api/integrado', verificarSesion, crearModuloRecursosCamas({
        database: { query },
        obtenerActor: crearObtenerActorDesdeSesion(permisosRecursosCamasPorRol),
        transacciones: { ejecutar: async operacion => {
          ejecutar()
          return operacion({ execute })
        } },
      }))
      // Política sólo de prueba. La correspondencia productiva todavía NO fue aprobada.
      app.use(
        '/api/prueba/lectura',
        verificarSesion,
        crearModuloLecturaRecursosCamas({
          database: { query },
          obtenerActor: crearObtenerActorDesdeSesion({
            Recepcionista: ['camas:consultar'],
            Enfermero: ['inventario:consultar'],
          }),
        }),
      )
      app.use(
        '/api/prueba/sin-politica',
        verificarSesion,
        crearModuloLecturaRecursosCamas({
          database: { query },
          obtenerActor: crearObtenerActorDesdeSesion(),
        }),
      )
      server = createServer(app)
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject)
        server.listen(0, '127.0.0.1', resolve)
      })
      url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
    })

    beforeEach(() => {
      query.mockClear()
      ejecutar.mockClear()
      execute.mockReset()
      registrar.mockClear()
    })
    afterAll(async () => {
      if (server)
        await new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        )
    })
    async function cookieSesion(rol: string, usuarioId: unknown = 7) {
      const respuesta = await fetch(`${url}/sesion-prueba`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rol, usuarioId }),
      })
      expect(respuesta.status).toBe(204)
      const cookie = respuesta.headers.get('set-cookie')?.split(';')[0]
      expect(cookie).toBeTruthy()
      return cookie!
    }

    it.each([['', 401], ['Limpieza', 403], ['Recepcionista', 403], ['Administrador', 201]])(
      'registro protegido para %s: %i', async (rol, estado) => {
        const cookie = rol ? await cookieSesion(rol) : ''
        const respuesta = await fetch(`${url}/api/auth/registro`, { method: 'POST', headers: { Cookie: cookie } })
        expect(respuesta.status).toBe(estado)
        expect(registrar).toHaveBeenCalledTimes(estado === 201 ? 1 : 0)
      },
    )
    it('no registra asignación sin Admisión, incluso para Administrador', async () => {
      const cookie = await cookieSesion('Administrador')
      const respuesta = await fetch(`${url}/api/integrado/asignaciones`, { method: 'POST', headers: { Cookie: cookie } })
      expect(respuesta.status).toBe(404)
      expect(ejecutar).not.toHaveBeenCalled()
    })
    it.each(['insumos', 'camas/1/bloqueo', 'camas/1/liberacion', 'camas/1/fin-mantenimiento'])(
      'Limpieza no accede a %s', async ruta => {
        const cookie = await cookieSesion('Limpieza')
        const respuesta = await fetch(`${url}/api/integrado/${ruta}`, {
          method: ruta === 'insumos' ? 'GET' : 'POST', headers: { Cookie: cookie },
        })
        expect(respuesta.status).toBe(403)
        expect(ejecutar).not.toHaveBeenCalled()
        expect(query).not.toHaveBeenCalled()
      },
    )
    it.each([
      ['Limpieza', 'confirmacion-limpieza', 'En limpieza', 'Libre'],
      ['Administrador', 'bloqueo', 'Libre', 'Bloqueada'],
      ['Administrador', 'fin-mantenimiento', 'Bloqueada', 'En limpieza'],
    ])('transición %s: %s con repositorio real y conexión de prueba', async (rol, ruta, anterior, siguiente) => {
      execute.mockResolvedValueOnce([[{ id: 1, estado: anterior, piso: 1, habitacion: 101, id_tipo_cama: 1 }], []])
        .mockResolvedValueOnce([[], []]).mockResolvedValueOnce([{ affectedRows: 1 }, []])
      const cookie = await cookieSesion(rol)
      const respuesta = await fetch(`${url}/api/integrado/camas/1/${ruta}`, {
        method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ estadoEsperado: anterior }),
      })
      expect(respuesta.status).toBe(200)
      expect(await respuesta.json()).toMatchObject({ transicion: { estado: siguiente } })
      expect(ejecutar).toHaveBeenCalledOnce()
      expect(execute).toHaveBeenLastCalledWith('UPDATE camas SET estado = ? WHERE id = ? AND estado = ?', [siguiente, 1, anterior])
    })

    it('401: sin cookie no llega a consultar MySQL', async () => {
      const respuesta = await fetch(`${url}/api/prueba/lectura/camas`)
      expect(respuesta.status).toBe(401)
      expect(query).not.toHaveBeenCalled()
    })
    it('200: usa la identidad de la sesión para consultar camas', async () => {
      const cookie = await cookieSesion('Recepcionista')
      const respuesta = await fetch(`${url}/api/prueba/lectura/camas`, {
        headers: { Cookie: cookie },
      })
      expect(respuesta.status).toBe(200)
      expect(await respuesta.json()).toEqual({ camas: [] })
      expect(query).toHaveBeenCalledOnce()
    })
    it('200: consulta inventario con el permiso explícito de prueba', async () => {
      const cookie = await cookieSesion('Enfermero')
      const respuesta = await fetch(`${url}/api/prueba/lectura/insumos`, {
        headers: { Cookie: cookie },
      })
      expect(respuesta.status).toBe(200)
      expect(await respuesta.json()).toEqual({ insumos: [] })
    })
    it('403: no amplía permisos porque exista una sesión', async () => {
      const cookie = await cookieSesion('Enfermero')
      expect(
        (await fetch(`${url}/api/prueba/lectura/camas`, { headers: { Cookie: cookie } })).status,
      ).toBe(403)
      expect(query).not.toHaveBeenCalled()
    })
    it('403: sin política aprobada ni Administrador recibe permisos', async () => {
      const cookie = await cookieSesion('Administrador')
      expect(
        (await fetch(`${url}/api/prueba/sin-politica/camas`, { headers: { Cookie: cookie } }))
          .status,
      ).toBe(403)
      expect(query).not.toHaveBeenCalled()
    })
    it('401: una cookie de sesión alterada no autentica', async () => {
      const cookie = await cookieSesion('Recepcionista')
      expect(
        (
          await fetch(`${url}/api/prueba/lectura/camas`, {
            headers: { Cookie: `${cookie}alterada` },
          })
        ).status,
      ).toBe(401)
      expect(query).not.toHaveBeenCalled()
    })
    it('401: valida también el tipo de usuarioId de la sesión', async () => {
      const cookie = await cookieSesion('Recepcionista', '7')
      expect(
        (await fetch(`${url}/api/prueba/lectura/camas`, { headers: { Cookie: cookie } })).status,
      ).toBe(401)
      expect(query).not.toHaveBeenCalled()
    })
    it('404: el montaje de lectura no habilita escrituras', async () => {
      const cookie = await cookieSesion('Recepcionista')
      expect(
        (
          await fetch(`${url}/api/prueba/lectura/asignaciones`, {
            method: 'POST',
            headers: { Cookie: cookie },
          })
        ).status,
      ).toBe(404)
      expect(query).not.toHaveBeenCalled()
    })
  },
)
