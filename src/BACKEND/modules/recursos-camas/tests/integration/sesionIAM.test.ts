import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRequire } from 'node:module'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import type { Request, Response } from 'express'
import { crearPacienteGatewayAdmision } from '../../infraestructure/crearPacienteGatewayAdmision.js'
import { Paciente } from '../../../admicion-turnos/domain/entities/Paciente.js'
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
    const buscarPorId = vi.fn()
    const buscarPorDni = vi.fn()
    const paciente = Paciente.reconstituir({
      id: 8, nombre: 'Prueba', apellido: 'Prueba', dni: '12345678',
      fechaNacimiento: '2000-01-01', genero: 'Prueba', telefono: '12345678',
      email: 'prueba@example.test', obraSocial: 1,
    })
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
      app.use('/api/con-admision', verificarSesion, crearModuloRecursosCamas({
        database: { query },
        pacientes: crearPacienteGatewayAdmision({ buscarPorId, buscarPorDni }),
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
      buscarPorId.mockReset().mockResolvedValue(paciente)
      buscarPorDni.mockReset().mockResolvedValue(paciente)
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

    it.each([
      ['Administrador', 200], ['Recepcionista', 200], ['Médico', 403],
      ['Enfermero', 403], ['Limpieza', 403], ['', 401],
    ])('consulta DNI para %s: %i', async (rol, estado) => {
      const cookie = rol ? await cookieSesion(rol) : ''
      const respuesta = await fetch(`${url}/api/con-admision/pacientes?dni=12345678`, { headers: { Cookie: cookie } })
      expect(respuesta.status).toBe(estado)
      if (estado === 200) {
        expect(await respuesta.json()).toEqual({ paciente: { id: 8, nombre: 'Prueba', apellido: 'Prueba', dni: '12345678' } })
        expect(buscarPorDni).toHaveBeenCalledExactlyOnceWith('12345678')
      } else expect(buscarPorDni).not.toHaveBeenCalled()
    })

    it.each(['', '?dni=', '?dni=%20', '?dni=1&dni=2', '?dni[x]=1'])(
      'rechaza un DNI inválido: %s', async queryString => {
        const cookie = await cookieSesion('Administrador')
        const respuesta = await fetch(`${url}/api/con-admision/pacientes${queryString}`, { headers: { Cookie: cookie } })
        expect(respuesta.status).toBe(400)
        expect(buscarPorDni).not.toHaveBeenCalled()
      },
    )

    it('responde 404 para un DNI inexistente', async () => {
      buscarPorDni.mockResolvedValue(null)
      const cookie = await cookieSesion('Administrador')
      const respuesta = await fetch(`${url}/api/con-admision/pacientes?dni=12345678`, { headers: { Cookie: cookie } })
      expect(respuesta.status).toBe(404)
      expect(ejecutar).not.toHaveBeenCalled()
    })

    it.each([
      ['Administrador', 201], ['Recepcionista', 201], ['Médico', 403],
      ['Enfermero', 403], ['Limpieza', 403],
    ])('asignación con Admisión para %s: %i', async (rol, estado) => {
      execute.mockResolvedValueOnce([[{ id: 1, estado: 'Libre', piso: 1, habitacion: 101, id_tipo_cama: 1 }], []])
        .mockResolvedValueOnce([[], []])
        .mockResolvedValueOnce([{ affectedRows: 1 }, []])
        .mockResolvedValueOnce([{ insertId: 20 }, []])
        .mockResolvedValueOnce([[{ fecha_ingreso: new Date('2026-11-16T12:00:00Z') }], []])
      const cookie = await cookieSesion(rol)
      const respuesta = await fetch(`${url}/api/con-admision/asignaciones`, {
        method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ idCama: 1, idPaciente: 8 }),
      })
      expect(respuesta.status).toBe(estado)
      if (estado === 201) {
        expect(buscarPorId).toHaveBeenCalledExactlyOnceWith(8)
        expect(await respuesta.json()).toMatchObject({ asignacion: { id: 20, idPaciente: 8, idUsuarioAsignador: 7 } })
      } else {
        expect(buscarPorId).not.toHaveBeenCalled()
        expect(ejecutar).not.toHaveBeenCalled()
      }
    })

    it('devuelve 404 sin abrir transacción si Admisión no encuentra el paciente', async () => {
      buscarPorId.mockResolvedValue(null)
      const cookie = await cookieSesion('Administrador')
      const respuesta = await fetch(`${url}/api/con-admision/asignaciones`, {
        method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ idCama: 1, idPaciente: 8 }),
      })
      expect(respuesta.status).toBe(404)
      expect(ejecutar).not.toHaveBeenCalled()
    })

    it('devuelve 409 con un mensaje claro si el paciente ya tiene cama', async () => {
      execute.mockResolvedValueOnce([[{ id: 1, estado: 'Libre', piso: 1, habitacion: 101, id_tipo_cama: 1 }], []])
        .mockResolvedValueOnce([[], []])
        .mockResolvedValueOnce([{ affectedRows: 1 }, []])
        .mockRejectedValueOnce(Object.assign(new Error("Duplicate entry for key 'uq_paciente_activo'"), { code: 'ER_DUP_ENTRY' }))
      const cookie = await cookieSesion('Administrador')
      const respuesta = await fetch(`${url}/api/con-admision/asignaciones`, {
        method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ idCama: 1, idPaciente: 8 }),
      })
      expect(respuesta.status).toBe(409)
      expect(await respuesta.json()).toEqual({
        codigo: 'PACIENTE_YA_ASIGNADO',
        mensaje: 'El paciente ya tiene una cama asignada. Actualizá el mapa.',
      })
    })

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
