import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import express, { type Request, type RequestHandler } from 'express';
import type { Server } from 'node:http';
import { PacienteRoutes } from '../../infraestructure/api/PacienteRoutes.js';
import { TurnoRoutes } from '../../infraestructure/api/TurnosRoutes.js';
import { ListaEsperaRoutes } from '../../infraestructure/api/ListaEsperaRoutes.js';
import { TriajeRoutes } from '../../infraestructure/api/TriajeRoutes.js';
import type { PacienteController } from '../../infraestructure/api/PacienteController.js';
import type { TurnoController } from '../../infraestructure/api/TurnoController.js';
import type { ListaEsperaController } from '../../infraestructure/api/ListaEsperaController.js';
import type { TriajeController } from '../../infraestructure/api/TriajeController.js';

// Sólo se prueban los middlewares reales; ningún controlador accede a MySQL.
const responder: RequestHandler = (_req, res) => { res.json({ ok: true }); };
let servidor: Server;
let base: string;

beforeAll(async () => {
    const app = express();
    app.use((req, _res, next) => {
        const rol = req.header('x-test-role');
        req.session = (rol ? { usuarioId: 1, rol } : {}) as Request['session'];
        next();
    });
    app.use('/pacientes', new PacienteRoutes({ listar: responder, registrar: responder } as unknown as PacienteController).obtenerRouter());
    app.use('/turnos', new TurnoRoutes({ listarAgenda: responder, reservar: responder, cancelar: responder, cambiarEstado: responder, insertarEntreturno: responder } as unknown as TurnoController).obtenerRouter());
    app.use('/espera', new ListaEsperaRoutes({ listar: responder, agregar: responder, cancelar: responder } as unknown as ListaEsperaController).obtenerRouter());
    app.use('/triaje', new TriajeRoutes({ listar: responder, registrar: responder, actualizarEstado: responder } as unknown as TriajeController).obtenerRouter());
    servidor = app.listen(0);
    await new Promise<void>(resolve => servidor.once('listening', resolve));
    const direccion = servidor.address();
    if (!direccion || typeof direccion === 'string') throw new Error('Servidor de prueba no disponible');
    base = `http://127.0.0.1:${direccion.port}`;
});

afterAll(async () => {
    if (servidor) await new Promise<void>((resolve, reject) => servidor.close(error => error ? reject(error) : resolve()));
});

describe('Permisos HTTP de Admisión', () => {
    it.each([
        ['GET', '/pacientes', ['Administrador', 'Recepcionista', 'Médico', 'Enfermero']],
        ['POST', '/pacientes', ['Administrador', 'Recepcionista']],
        ['GET', '/turnos/agenda', ['Administrador', 'Recepcionista', 'Médico']],
        ['POST', '/turnos', ['Administrador', 'Recepcionista']],
        ['DELETE', '/turnos/1', ['Administrador', 'Recepcionista']],
        ['PATCH', '/turnos/1/estado', ['Administrador', 'Recepcionista']],
        ['POST', '/turnos/1/entreturno', ['Administrador', 'Recepcionista']],
        ['GET', '/espera', ['Administrador', 'Recepcionista']],
        ['POST', '/espera', ['Administrador', 'Recepcionista']],
        ['DELETE', '/espera/1', ['Administrador', 'Recepcionista']],
        ['GET', '/triaje', ['Administrador', 'Enfermero', 'Recepcionista']],
        ['POST', '/triaje', ['Administrador', 'Enfermero']],
        ['PATCH', '/triaje/1/estado', ['Administrador', 'Enfermero']],
    ] as const)('%s %s conserva 401, 403 y los roles autorizados', async (method, ruta, permitidos) => {
        expect((await fetch(base + ruta, { method })).status).toBe(401);
        for (const rol of ['Administrador', 'Recepcionista', 'Médico', 'Enfermero', 'Limpieza']) {
            const respuesta = await fetch(base + ruta, { method, headers: { 'x-test-role': rol } });
            expect(respuesta.status, rol).toBe((permitidos as readonly string[]).includes(rol) ? 200 : 403);
        }
    });
});
