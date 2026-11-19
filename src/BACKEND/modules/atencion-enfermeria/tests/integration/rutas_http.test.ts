import { afterEach, describe, expect, it, vi } from 'vitest';
import express, { type Request, type Response } from 'express';
import type { Server } from 'node:http';
import administracionMedicacionRoutes from '../../infraestructure/api/administracion-medicacion/administracion_medicacion_routes.js';
import signoVitalRoutes from '../../infraestructure/api/signos-vitales/signo_vital_routes.js';
import dashboardRoutes from '../../infraestructure/api/dashboard/dashboard_routes.js';
import { verificarSesion } from '../../../IAM/infraestructure/middlewares/verificarSesion.js';

const mocks = vi.hoisted(() => ({
    administrar: vi.fn(async (req: Request, res: Response) =>
        res.status(201).json({ autor: req.session.usuarioId })),
    obtenerPermisos: vi.fn(async (req: Request, res: Response) =>
        res.status(200).json({ puedeCrearIndicacion: req.session.rol === 'Médico' })),
    crearIndicacion: vi.fn(async (req: Request, res: Response) =>
        res.status(201).json({ medico: req.session.usuarioId })),
    obtenerOpcionesIndicacion: vi.fn(async (_req: Request, res: Response) => res.status(200).json({ pacientes: [], insumos: [] })),
    obtenerHistorial: vi.fn(async (_req: Request, res: Response) => res.status(200).json([])),
    obtenerTodas: vi.fn(async (_req: Request, res: Response) => res.status(200).json([])),
    registrar: vi.fn(async (req: Request, res: Response) =>
        res.status(201).json({ autor: req.session.usuarioId })),
    obtenerDashboard: vi.fn(async (_req: Request, res: Response) => res.status(200).json([]))
}));

vi.mock('../../infraestructure/api/administracion-medicacion/administracion_medicacion_dependencies.js', () => ({
    administracionMedicacionController: {
        administrar: mocks.administrar,
        obtenerPermisos: mocks.obtenerPermisos,
        crearIndicacion: mocks.crearIndicacion,
        obtenerOpcionesIndicacion: mocks.obtenerOpcionesIndicacion,
        obtenerHistorial: mocks.obtenerHistorial,
        obtenerTodas: mocks.obtenerTodas,
    }
}));
vi.mock('../../infraestructure/api/signos-vitales/signo_vital_dependencies.js', () => ({
    signoVitalController: { registrar: mocks.registrar }
}));
vi.mock('../../infraestructure/api/dashboard/dashboard_dependencies.js', () => ({
    dashboardController: { obtener: mocks.obtenerDashboard }
}));

let servidor: Server | undefined;
let base_url = '';

async function iniciarServidor() {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
        req.session = {} as Request['session'];
        const usuario = req.header('x-test-user');
        const rol = req.header('x-test-role');
        if (usuario && rol) req.session = { usuarioId: Number(usuario), rol } as Request['session'];
        next();
    });
    app.use(verificarSesion);
    app.use('/api/administracion-medicacion', administracionMedicacionRoutes);
    app.use('/api/signos-vitales', signoVitalRoutes);
    app.use('/api/dashboard', dashboardRoutes);

    servidor = app.listen(0);
    await new Promise<void>(resolve => servidor?.once('listening', resolve));
    const direccion = servidor.address();
    if (!direccion || typeof direccion === 'string') throw new Error('No se inició el servidor de prueba');
    base_url = `http://127.0.0.1:${direccion.port}`;
}

afterEach(async () => {
    if (servidor) await new Promise<void>((resolve, reject) => servidor?.close(error => error ? reject(error) : resolve()));
    servidor = undefined;
    vi.clearAllMocks();
});

describe('autorización HTTP de rutas de Enfermería', () => {
    it('permite a Enfermería consultar medicación y reserva las opciones de alta a Médico', async () => {
        await iniciarServidor();
        const permisosEnfermero = await fetch(`${base_url}/api/administracion-medicacion/permisos`, {
            headers: { 'x-test-user': '7', 'x-test-role': 'Enfermero' }
        });
        await expect(permisosEnfermero.json()).resolves.toEqual({ puedeCrearIndicacion: false });
        const enfermero = await fetch(`${base_url}/api/administracion-medicacion`, {
            headers: { 'x-test-user': '7', 'x-test-role': 'Enfermero' }
        });
        expect(enfermero.status).toBe(200);
        expect(mocks.obtenerTodas).toHaveBeenCalledOnce();

        const opcionesEnfermero = await fetch(`${base_url}/api/administracion-medicacion/opciones-indicacion`, {
            headers: { 'x-test-user': '7', 'x-test-role': 'Enfermero' }
        });
        expect(opcionesEnfermero.status).toBe(403);

        const opcionesMedico = await fetch(`${base_url}/api/administracion-medicacion/opciones-indicacion`, {
            headers: { 'x-test-user': '8', 'x-test-role': 'Médico' }
        });
        expect(opcionesMedico.status).toBe(200);
        expect(mocks.obtenerOpcionesIndicacion).toHaveBeenCalledOnce();
        const permisosMedico = await fetch(`${base_url}/api/administracion-medicacion/permisos`, {
            headers: { 'x-test-user': '8', 'x-test-role': 'Médico' }
        });
        await expect(permisosMedico.json()).resolves.toEqual({ puedeCrearIndicacion: true });
    });

    it('reserva la creación de indicaciones a Médico y usa el usuario de sesión', async () => {
        await iniciarServidor();
        const denegada = await fetch(`${base_url}/api/administracion-medicacion/indicaciones`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'x-test-user': '8', 'x-test-role': 'Enfermero' }, body: '{}'
        });
        expect(denegada.status).toBe(403);
        const permitida = await fetch(`${base_url}/api/administracion-medicacion/indicaciones`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'x-test-user': '8', 'x-test-role': 'Médico' }, body: '{}'
        });
        expect(permitida.status).toBe(201);
        await expect(permitida.json()).resolves.toEqual({ medico: 8 });
        expect(mocks.crearIndicacion).toHaveBeenCalledOnce();
    });

    it.each([
        ['/api/administracion-medicacion', 'POST'],
        ['/api/signos-vitales', 'POST']
    ])('%s devuelve 401 sin usuario de sesión', async (ruta, metodo) => {
        await iniciarServidor();
        const respuesta = await fetch(`${base_url}${ruta}`, { method: metodo, headers: { 'Content-Type': 'application/json' }, body: '{}' });
        expect(respuesta.status).toBe(401);
    });

    it.each([
        ['/api/administracion-medicacion', 'administrar'],
        ['/api/signos-vitales', 'registrar']
    ])('%s devuelve 403 a un rol que no es Enfermero', async (ruta, accion) => {
        await iniciarServidor();
        const respuesta = await fetch(`${base_url}${ruta}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-test-user': '7', 'x-test-role': 'Médico' },
            body: '{}'
        });
        expect(respuesta.status).toBe(403);
        expect(accion === 'administrar' ? mocks.administrar : mocks.registrar).not.toHaveBeenCalled();
    });

    it.each([
        ['/api/administracion-medicacion', 'administrar'],
        ['/api/signos-vitales', 'registrar']
    ])('%s permite al Enfermero y conserva la identidad de sesión en el controlador', async (ruta, accion) => {
        await iniciarServidor();
        const respuesta = await fetch(`${base_url}${ruta}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-test-user': '7', 'x-test-role': 'Enfermero' },
            body: JSON.stringify({ id_enfermero: 999 })
        });
        expect(respuesta.status).toBe(201);
        await expect(respuesta.json()).resolves.toEqual({ autor: 7 });
        expect(accion === 'administrar' ? mocks.administrar : mocks.registrar).toHaveBeenCalledOnce();
    });

    it('protege el dashboard de enfermería con sesión y rol Enfermero', async () => {
        await iniciarServidor();
        const sin_sesion = await fetch(`${base_url}/api/dashboard`);
        expect(sin_sesion.status).toBe(401);

        const sin_permiso = await fetch(`${base_url}/api/dashboard`, {
            headers: { 'x-test-user': '7', 'x-test-role': 'Médico' }
        });
        expect(sin_permiso.status).toBe(403);
        expect(mocks.obtenerDashboard).not.toHaveBeenCalled();

        const enfermero = await fetch(`${base_url}/api/dashboard`, {
            headers: { 'x-test-user': '7', 'x-test-role': 'Enfermero' }
        });
        expect(enfermero.status).toBe(200);
        expect(mocks.obtenerDashboard).toHaveBeenCalledOnce();
    });
});
