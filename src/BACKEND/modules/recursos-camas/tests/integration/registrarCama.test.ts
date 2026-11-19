import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import session from 'express-session'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { crearModuloRecursosCamas, crearModuloLecturaRecursosCamas } from '../../recursosCamas.module.js'
import { crearObtenerActorDesdeSesion, permisosRecursosCamasPorRol } from '../../infraestructure/api/obtenerActorSesion.js'

describe('Alta de camas: HTTP, IAM, caso de uso y SQL con conexión simulada', () => {
  let server: Server
  let url: string
  let admin: string
  const cookies: Record<string, string> = {}
  const query = vi.fn()
  const datos = { habitacion: 204, piso: 0, idTipoCama: 1 }
  async function enviar(body: unknown, cookie = admin, ruta = '/api/recursos-camas/camas') {
    return fetch(url + ruta, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) })
  }
  beforeAll(async () => {
    const app = express()
    app.use(express.json())
    app.use(session({ secret: 'solo-pruebas-de-alta', resave: false, saveUninitialized: false }))
    // Sesiones de prueba exclusivamente en este servidor aislado, sin usuarios reales.
    app.get('/sesion-prueba/:rol', (req, res) => {
      req.session.usuarioId = 3
      req.session.rol = String(req.params.rol)
      res.sendStatus(200)
    })
    const deps = { database: { query }, obtenerActor: crearObtenerActorDesdeSesion(permisosRecursosCamasPorRol) }
    app.use('/api/recursos-camas', crearModuloRecursosCamas(deps))
    app.use('/lectura', crearModuloLecturaRecursosCamas(deps))
    app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      // Mismo rechazo de JSON inválido que el servidor compartido.
      const invalido = error instanceof SyntaxError && 'type' in error && error.type === 'entity.parse.failed'
      res.status(invalido ? 400 : 500).json({ mensaje: 'Error en la solicitud' })
    })
    server = createServer(app)
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
    for (const rol of ['Administrador', 'Recepcionista', 'Médico', 'Enfermero', 'Limpieza']) {
      const r = await fetch(url + '/sesion-prueba/' + encodeURIComponent(rol))
      await r.text()
      cookies[rol] = r.headers.get('set-cookie')!.split(';')[0]!
    }
    admin = cookies.Administrador!
  })
  afterAll(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())) })
  beforeEach(() => {
    query.mockReset()
    let id = 10
    query.mockImplementation(async (sql: string) => sql.startsWith('INSERT')
      ? [{ insertId: id++ }, []] : [[{ id: 1, nombre: 'Compartida' }, { id: 2, nombre: 'Privada' }], []])
  })
  it('registra Libre mediante una única sentencia parametrizada y sin asignación', async () => {
    const r = await enviar(datos)
    expect(r.status).toBe(201)
    expect(await r.json()).toEqual({ cama: { id: 10, estado: 'Libre' } })
    expect(query).toHaveBeenCalledExactlyOnceWith(
      "INSERT INTO camas (habitacion, piso, id_tipo_cama, estado) VALUES (?, ?, ?, 'Libre')", [204, 0, 1])
  })
  it('consulta los tipos existentes sin inventar valores ni exponer su costo', async () => {
    const r = await fetch(url + '/api/recursos-camas/tipos-cama', { headers: { cookie: admin } })
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({ tipos: [{ id: 1, nombre: 'Compartida' }, { id: 2, nombre: 'Privada' }] })
  })
  it.each([{}, null, [], { ...datos, habitacion: 0 }, { ...datos, habitacion: 1.5 },
    { ...datos, habitacion: '204' }, { ...datos, piso: '' }, { ...datos, piso: null },
    { ...datos, piso: 1.5 }, { ...datos, piso: 2147483648 }, { ...datos, idTipoCama: 0 },
    { ...datos, estado: 'Ocupada' }, { ...datos, estado: 'Bloqueada' },
  ])('rechaza datos inválidos %j sin escribir', async body => {
    expect((await enviar(body)).status).toBe(400)
    expect(query).not.toHaveBeenCalled()
  })
  it('sin sesión rechaza el alta antes de acceder a MySQL', async () => {
    expect((await enviar(datos, '')).status).toBe(401)
    expect(query).not.toHaveBeenCalled()
  })
  it.each(['Recepcionista', 'Médico', 'Enfermero', 'Limpieza'])('no permite crear al rol %s', async rol => {
    expect((await enviar(datos, cookies[rol]!)).status).toBe(403)
    expect(query).not.toHaveBeenCalled()
  })
  it('traduce una restricción única real de MySQL a conflicto 409', async () => {
    query.mockRejectedValueOnce(Object.assign(new Error('SQL privado'), { code: 'ER_DUP_ENTRY' }))
    const r = await enviar(datos)
    expect(r.status).toBe(409)
    expect(await r.json()).toMatchObject({ codigo: 'CAMA_DUPLICADA' })
  })
  it('rechaza un tipo inexistente mediante la clave foránea', async () => {
    query.mockRejectedValueOnce(Object.assign(new Error('SQL privado'), { code: 'ER_NO_REFERENCED_ROW_2' }))
    const r = await enviar({ ...datos, idTipoCama: 999 })
    expect(r.status).toBe(400)
    expect(await r.text()).toContain('tipo de cama seleccionado no existe')
  })
  it('admite varias camas en una habitación como permite el esquema actual', async () => {
    expect((await (await enviar(datos)).json()).cama.id).toBe(10)
    expect((await (await enviar(datos)).json()).cama.id).toBe(11)
  })
  it('no habilita el alta en el montaje de sólo lectura', async () => {
    expect((await enviar(datos, admin, '/lectura/camas')).status).toBe(404)
    expect(query).not.toHaveBeenCalled()
  })
})
