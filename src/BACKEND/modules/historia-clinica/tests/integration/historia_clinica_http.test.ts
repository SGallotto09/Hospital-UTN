import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import session from 'express-session';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

const mocks = vi.hoisted(() => ({ query: vi.fn(), execute: vi.fn(), transaccion: vi.fn() }));
vi.mock('../../../../database/connectionDB.js', () => ({
    Database: { getInstance: () => ({ query: mocks.query, withTransaction: mocks.transaccion }) },
}));
import router from '../../infraestructure/api/historia_clinica_routes.js';

describe('Historia Clínica: HTTP, IAM y adaptadores reales con MySQL simulado', () => {
    let server: Server;
    let url: string;
    const paciente = {
        id: 1,
        nombre: 'Paciente',
        apellido: 'Ficticio',
        dni: '90000001',
        fecha_nacimiento: '1990-01-01',
        genero: 'Otro',
        telefono: '12345',
        email: 'prueba@example.test',
        obra_social: 1,
    };
    let cookieMedico: string;
    let cookieEnfermero: string;
    let cookieAdministrador: string;
    let cookieRecepcionista: string;
    const rectificacion = {
        id_paciente: 1,
        id_medico: 999,
        sustancia: 'Penicilina',
        reaccion: 'Erupción',
        gravedad: 'leve',
        estado: 'descartada',
        fecha_deteccion: '2026-11-16',
        motivo: '  Antecedente reevaluado  ',
    };
    const rutaRectificacion = '/alergias/5/rectificaciones';

    async function sesion(rol: string) {
        const respuesta = await fetch(url + '/sesion-prueba', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rol }),
        });
        await respuesta.text();
        return respuesta.headers.get('set-cookie')!.split(';')[0]!;
    }
    async function peticion(ruta: string, cookie?: string, datos?: object) {
        return fetch(url + '/api/historia-clinica' + ruta, {
            method: datos ? 'POST' : 'GET',
            headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
            ...(datos ? { body: JSON.stringify(datos) } : {}),
        });
    }
    beforeAll(async () => {
        const app = express();
        app.use(express.json());
        app.use(
            session({
                secret: 'sesion-exclusiva-de-pruebas',
                resave: false,
                saveUninitialized: false,
            }),
        );
        // Fixture exclusiva del servidor de pruebas: no se agrega al servidor productivo.
        app.post('/sesion-prueba', (req, res) => {
            req.session.usuarioId = 3;
            req.session.rol = req.body.rol;
            res.sendStatus(200);
        });
        app.use('/api/historia-clinica', router);
        server = createServer(app);
        await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
        url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
        cookieMedico = await sesion('Médico');
        cookieEnfermero = await sesion('Enfermero');
        cookieAdministrador = await sesion('Administrador');
        cookieRecepcionista = await sesion('Recepcionista');
    });
    afterAll(async () => {
        await new Promise<void>((resolve, reject) =>
            server.close((error) => (error ? reject(error) : resolve())),
        );
    });
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.query.mockImplementation(async (sql: string, valores?: unknown[]) => {
            if (sql.includes('FROM pacientes'))
                return [
                    [
                        ...(!valores || valores[0] === 1 || valores[0] === '90000001'
                            ? [paciente]
                            : []),
                    ],
                    [],
                ];
            return [[], []];
        });
        mocks.execute.mockImplementation(async (sql: string) =>
            sql.startsWith('INSERT') ? [{ insertId: 9 }, []] : [[{ id: 9 }], []],
        );
        mocks.transaccion.mockImplementation(async (operacion) =>
            operacion({ execute: mocks.execute }),
        );
    });

    it.each([
        '/pacientes',
        '/paciente/1',
        '/paciente/1/estudios',
        '/alergias/paciente/1',
        '/sesion',
    ])('rechaza %s sin sesión', async (ruta) => {
        expect((await peticion(ruta)).status).toBe(401);
        expect(mocks.query).not.toHaveBeenCalled();
    });
    it('rechaza un rol ajeno incluso consultando directamente HTTP', async () => {
        expect((await peticion('/paciente/1', cookieRecepcionista)).status).toBe(403);
        expect(mocks.query).not.toHaveBeenCalled();
    });
    it.each(['medico', 'enfermero', 'administrador'])(
        'permite consulta a %s sin inventar datos clínicos',
        async (rol) => {
            const cookie = {
                medico: cookieMedico,
                enfermero: cookieEnfermero,
                administrador: cookieAdministrador,
            }[rol];
            const respuesta = await peticion('/paciente/1', cookie);
            expect(respuesta.status).toBe(200);
            expect(await respuesta.json()).toMatchObject({
                paciente: { id: 1, dni: '90000001' },
                alergias: [],
                antecedentesFamiliares: [],
                evolucionesMedicas: [],
                estudiosClinicos: [],
            });
        },
    );
    it('busca el paciente existente por DNI mediante Admisión', async () => {
        const respuesta = await peticion('/pacientes/dni/90000001', cookieMedico);
        expect(await respuesta.json()).toMatchObject({ id: 1, dni: '90000001' });
        expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining('FROM pacientes'), [
            '90000001',
        ]);
    });
    it('devuelve 404 si el paciente no existe', async () => {
        expect((await peticion('/paciente/999', cookieMedico)).status).toBe(404);
    });
    it.each(['0', '-1', 'abc', '1.5'])('rechaza ID %s antes de consultar', async (id) => {
        expect((await peticion('/paciente/' + id, cookieMedico)).status).toBe(400);
        expect(mocks.query).not.toHaveBeenCalled();
    });
    it('no permite a Enfermería ni Administrador registrar un acto médico', async () => {
        for (const cookie of [cookieEnfermero, cookieAdministrador]) {
            expect(
                (
                    await peticion('/evoluciones', cookie, {
                        id_paciente: 1,
                        descripcion: 'Estable',
                        diagnostico: 'Control',
                    })
                ).status,
            ).toBe(403);
        }
        expect(mocks.transaccion).not.toHaveBeenCalled();
    });
    it.each([
        [
            '/alergias',
            {
                sustancia: 'Penicilina',
                reaccion: 'Erupción',
                gravedad: 'leve',
                fecha_deteccion: '2026-11-16',
            },
        ],
        ['/antecedentes', { parentesco: 'Padre', enfermedad: 'Diabetes', observaciones: '' }],
        ['/evoluciones', { descripcion: 'Estable', diagnostico: 'Control' }],
    ])(
        'registra %s en una transacción e ignora la identidad enviada por el cliente',
        async (ruta, datos) => {
            const respuesta = await peticion(ruta, cookieMedico, {
                ...datos,
                id_paciente: 1,
                id_medico: 999,
            });
            expect(respuesta.status).toBe(201);
            expect(mocks.transaccion).toHaveBeenCalledOnce();
            const insercion = mocks.execute.mock.calls.find(([sql]) => sql.startsWith('INSERT'))!;
            expect(insercion[1].at(-1)).toBe(3);
            expect(insercion[1][0]).toBe(1);
        },
    );
    it.each(['2026-02-30', 'ayer', '', '2026-11-16T10:00:00'])(
        'rechaza fecha de alergia %s sin escritura',
        async (fecha) => {
            expect(
                (
                    await peticion('/alergias', cookieMedico, {
                        id_paciente: 1,
                        sustancia: 'A',
                        reaccion: 'R',
                        gravedad: 'leve',
                        fecha_deteccion: fecha,
                    })
                ).status,
            ).toBe(400);
            expect(mocks.execute).not.toHaveBeenCalled();
        },
    );
    it('rechaza un cuerpo incompleto y permite corregirlo', async () => {
        expect((await peticion('/evoluciones', cookieMedico, {})).status).toBe(400);
        expect(mocks.execute).not.toHaveBeenCalled();
    });
    it('no filtra errores SQL ni información clínica', async () => {
        mocks.execute.mockRejectedValueOnce(
            Object.assign(new Error('SQL y datos privados'), { code: 'ER_BAD_FIELD_ERROR' }),
        );
        const respuesta = await peticion('/evoluciones', cookieMedico, {
            id_paciente: 1,
            descripcion: 'Estable',
            diagnostico: 'Control',
        });
        expect(respuesta.status).toBe(500);
        expect(await respuesta.text()).not.toContain('SQL');
    });
    it('informa una referencia inexistente sin exponer SQL', async () => {
        mocks.execute.mockRejectedValueOnce(
            Object.assign(new Error('FK'), { code: 'ER_NO_REFERENCED_ROW_2' }),
        );
        expect(
            (
                await peticion('/evoluciones', cookieMedico, {
                    id_paciente: 999,
                    descripcion: 'Estable',
                    diagnostico: 'Control',
                })
            ).status,
        ).toBe(404);
    });
    it('no ofrece eliminación ni modificación de registros clínicos', async () => {
        expect(
            (
                await fetch(url + '/api/historia-clinica/alergias/1', {
                    method: 'DELETE',
                    headers: { cookie: cookieMedico },
                })
            ).status,
        ).toBe(404);
        expect(mocks.execute).not.toHaveBeenCalled();
    });

    it('rectifica mediante una transacción que agrega la versión y el vínculo sin editar la anterior', async () => {
        const anterior = { id: 5, estado: 'activa', id_alergia_nueva: 9, id_alergia_anterior: null };
        const nueva = {
            id: 9,
            estado: 'descartada',
            id_medico: 3,
            fecha_registro: '2026-11-19T12:00:00.000Z',
        };
        mocks.execute
            .mockResolvedValueOnce([[anterior], []])
            .mockResolvedValueOnce([[], []])
            .mockResolvedValueOnce([{ insertId: 9 }, []])
            .mockResolvedValueOnce([[nueva], []])
            .mockResolvedValueOnce([{}, []]);

        const respuesta = await peticion(rutaRectificacion, cookieMedico, rectificacion);
        expect(respuesta.status).toBe(201);
        expect(await respuesta.json()).toEqual(nueva);
        expect(mocks.transaccion).toHaveBeenCalledTimes(1);
        expect(mocks.execute).toHaveBeenCalledTimes(5);
        expect(mocks.execute).toHaveBeenNthCalledWith(
            1,
            expect.stringContaining('id_paciente = ? FOR UPDATE'),
            [5, 1],
        );
        expect(mocks.execute).toHaveBeenNthCalledWith(
            3,
            expect.stringContaining('INSERT INTO alergias'),
            [1, 'Penicilina', 'Erupción', 'leve', expect.any(Date), 'descartada', 3],
        );
        expect(mocks.execute).toHaveBeenNthCalledWith(
            5,
            expect.stringContaining('INSERT INTO alergia_rectificaciones'),
            [5, 9, 'Antecedente reevaluado'],
        );

        const versiones = [
            { ...nueva, id_alergia_anterior: 5, id_alergia_nueva: null, motivo: 'Antecedente reevaluado' },
            anterior,
        ];
        mocks.query.mockResolvedValueOnce([versiones, []]);
        const historial = await peticion('/alergias/paciente/1/rectificaciones', cookieEnfermero);
        expect(historial.status).toBe(200);
        expect(await historial.json()).toEqual(versiones);
        expect(mocks.query).toHaveBeenCalledWith(
            expect.stringContaining('LEFT JOIN alergia_rectificaciones'),
            [1],
        );
    });

    it('rechaza rectificaciones sin sesión, sin rol Médico o con motivo vacío antes de escribir', async () => {
        expect((await peticion(rutaRectificacion, undefined, rectificacion)).status).toBe(401);
        expect((await peticion(rutaRectificacion, cookieEnfermero, rectificacion)).status).toBe(403);
        expect((await peticion(rutaRectificacion, cookieAdministrador, rectificacion)).status).toBe(403);
        expect(
            (await peticion(rutaRectificacion, cookieMedico, { ...rectificacion, motivo: ' ' })).status,
        ).toBe(400);
        expect(mocks.transaccion).not.toHaveBeenCalled();
    });

    it('rechaza versiones de otro paciente y versiones ya reemplazadas antes de insertar', async () => {
        mocks.execute.mockResolvedValueOnce([[], []]);
        expect((await peticion(rutaRectificacion, cookieMedico, rectificacion)).status).toBe(404);
        expect(mocks.execute).toHaveBeenCalledTimes(1);

        mocks.execute
            .mockResolvedValueOnce([[{ id: 5 }], []])
            .mockResolvedValueOnce([[{ id_alergia_nueva: 9 }], []]);
        expect((await peticion(rutaRectificacion, cookieMedico, rectificacion)).status).toBe(409);
        expect(mocks.execute).toHaveBeenCalledTimes(3);
    });
});
