import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { AdministrarMedicacion } from '../../use-cases/administracion-medicacion/administrar_medicacion.js';
import { AdministracionMedicacionController } from '../../infraestructure/api/administracion-medicacion/administracion_medicacion_controller.js';
import { ObtenerMedicaciones } from '../../use-cases/administracion-medicacion/obtener_medicaciones.js';
import { RegistrarSignoVital } from '../../use-cases/signos-vitales/registrar_signo_vital.js';
import { SignoVitalController } from '../../infraestructure/api/signos-vitales/signo_vital_controller.js';
import { ObtenerSignosVitales } from '../../use-cases/signos-vitales/obtener_signos_vitales.js';
import { ObtenerSingosVitalesPorPacientes } from '../../use-cases/signos-vitales/obetener_signos_vitales_por_pacientes.js';
import { ErrorEnfermeria } from '../../domain/errors/error_enfermeria.js';
import { event_bus } from '../../../../events/event_bus.js';

const horario = new Date('2026-11-16T10:00:00');
const indicacion = {
    fecha: '2026-11-16', hora_inicio: '10:00:00', frecuencia_horas: 8, cantidad: 1
};

function respuesta() {
    return {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
    } as unknown as Response;
}

function repositorioMedicacion(overrides = {}) {
    return {
        obtenerTodas: vi.fn(),
        obtenerDatosIndicacion: vi.fn().mockResolvedValue(indicacion),
        existeDosisAdministrada: vi.fn().mockResolvedValue(false),
        administrar: vi.fn().mockResolvedValue(25),
        ...overrides
    };
}

function controladorMedicacion(repo: ReturnType<typeof repositorioMedicacion>) {
    return new AdministracionMedicacionController(
        new ObtenerMedicaciones(repo), new AdministrarMedicacion(repo)
    );
}

function controladorSignos(repo: { guardar: ReturnType<typeof vi.fn> }) {
    return new SignoVitalController(
        new RegistrarSignoVital(repo as never),
        new ObtenerSignosVitales(repo as never),
        new ObtenerSingosVitalesPorPacientes(repo as never)
    );
}

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(horario);
});

afterEach(() => vi.useRealTimers());

describe('autoría y errores HTTP de Enfermería', () => {
    it('registra medicación con el enfermero de sesión y omite el ID falso del body', async () => {
        const repo = repositorioMedicacion();
        const res = respuesta();
        const req = {
            session: { usuarioId: 7 },
            body: {
                id_indicacion_medica: 1, id_enfermero: 999,
                horario_programado: horario.toISOString(), cantidad_administrada: 1
            }
        } as unknown as Request;
        const emitir = vi.spyOn(event_bus, 'emitir_medicacion_administrada');

        await controladorMedicacion(repo).administrar(req, res);

        expect(repo.administrar).toHaveBeenCalledWith(1, 7, expect.any(Date), expect.any(Date), 1);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(emitir).toHaveBeenCalledWith({ idAdministracionMedicacion: 25, cantidadAdministrada: 1 });
        emitir.mockRestore();
    });

    it('responde 401 sin sesión y no intenta guardar medicación', async () => {
        const repo = repositorioMedicacion();
        const res = respuesta();
        await controladorMedicacion(repo).administrar({ body: { id_enfermero: 7 } } as Request, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(repo.administrar).not.toHaveBeenCalled();
    });

    it('responde 400 fuera del horario permitido', async () => {
        const repo = repositorioMedicacion();
        const res = respuesta();
        await controladorMedicacion(repo).administrar({
            session: { usuarioId: 7 },
            body: { id_indicacion_medica: 1, horario_programado: '2026-11-16T08:00:00' }
        } as unknown as Request, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(repo.administrar).not.toHaveBeenCalled();
    });

    it('responde 409 a una dosis duplicada', async () => {
        const repo = repositorioMedicacion({ existeDosisAdministrada: vi.fn().mockResolvedValue(true) });
        const res = respuesta();
        await controladorMedicacion(repo).administrar({
            session: { usuarioId: 7 },
            body: { id_indicacion_medica: 1, horario_programado: horario.toISOString() }
        } as unknown as Request, res);
        expect(res.status).toHaveBeenCalledWith(409);
        expect(repo.administrar).not.toHaveBeenCalled();
    });

    it('responde 409 por stock insuficiente y 500 por error de persistencia', async () => {
        for (const [error, estado] of [
            [new ErrorEnfermeria('No hay stock suficiente', 409), 409],
            [new Error('MySQL no disponible'), 500]
        ] as const) {
            const repo = repositorioMedicacion({ administrar: vi.fn().mockRejectedValue(error) });
            const res = respuesta();
            await controladorMedicacion(repo).administrar({
                session: { usuarioId: 7 },
                body: { id_indicacion_medica: 1, horario_programado: horario.toISOString() }
            } as unknown as Request, res);
            expect(res.status).toHaveBeenCalledWith(estado);
        }
    });

    it('no emite MedicacionAdministrada si falla guardar', async () => {
        const repo = repositorioMedicacion({ administrar: vi.fn().mockRejectedValue(new Error('falló MySQL')) });
        const res = respuesta();
        const emitir = vi.spyOn(event_bus, 'emitir_medicacion_administrada');
        await controladorMedicacion(repo).administrar({
            session: { usuarioId: 7 },
            body: { id_indicacion_medica: 1, horario_programado: horario.toISOString() }
        } as unknown as Request, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(emitir).not.toHaveBeenCalled();
        emitir.mockRestore();
    });

    it('responde 404 si no existe la indicación y no emite el evento', async () => {
        const repo = repositorioMedicacion({ obtenerDatosIndicacion: vi.fn().mockResolvedValue(null) });
        const res = respuesta();
        const emitir = vi.spyOn(event_bus, 'emitir_medicacion_administrada');
        await controladorMedicacion(repo).administrar({
            session: { usuarioId: 7 },
            body: { id_indicacion_medica: 999, horario_programado: horario.toISOString() }
        } as unknown as Request, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(emitir).not.toHaveBeenCalled();
        emitir.mockRestore();
    });

    it('registra signos vitales con el autor de sesión e ignora el autor del body', async () => {
        const repo = { guardar: vi.fn().mockResolvedValue({ id: 4 }) };
        const res = respuesta();
        await controladorSignos(repo).registrar({
            session: { usuarioId: 8 },
            body: {
                id_paciente: 2, id_enfermero: 999, presion_arterial: '120/80',
                frecuencia_cardiaca: 70, temperatura: 36.5
            }
        } as unknown as Request, res);
        expect(repo.guardar).toHaveBeenCalledWith(expect.objectContaining({ id_enfermero: 8 }));
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('responde 401 sin sesión, 400 con valores inválidos y 500 ante fallo de MySQL', async () => {
        const datos = {
            id_paciente: 2, presion_arterial: '120/80', frecuencia_cardiaca: 70, temperatura: 36.5
        };
        const repo = { guardar: vi.fn() };
        const controller = controladorSignos(repo);
        const no_autenticado = respuesta();
        await controller.registrar({ body: datos } as Request, no_autenticado);
        expect(no_autenticado.status).toHaveBeenCalledWith(401);

        const invalido = respuesta();
        await controller.registrar({ session: { usuarioId: 8 }, body: { ...datos, temperatura: 0 } } as unknown as Request, invalido);
        expect(invalido.status).toHaveBeenCalledWith(400);
        expect(repo.guardar).not.toHaveBeenCalled();

        repo.guardar.mockRejectedValueOnce(new Error('MySQL no disponible'));
        const error_interno = respuesta();
        await controller.registrar({ session: { usuarioId: 8 }, body: datos } as unknown as Request, error_interno);
        expect(error_interno.status).toHaveBeenCalledWith(500);
    });
});
