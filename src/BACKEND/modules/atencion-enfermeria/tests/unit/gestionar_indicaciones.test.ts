import { describe, expect, it, vi } from 'vitest';
import { GestionarIndicaciones } from '../../use-cases/administracion-medicacion/gestionar_indicaciones.js';

const datos = {
    id_medico: 12,
    id_paciente: 4,
    id_insumo: 7,
    cantidad: 2,
    fecha: '2026-12-01',
    hora_inicio: '08:30',
    frecuencia_horas: 6,
};

function crearCaso() {
    return {
        guardar: vi.fn(),
        obtenerTodas: vi.fn(),
        obtenerOpcionesIndicacion: vi.fn(),
        crearIndicacion: vi.fn().mockResolvedValue(23),
        obtenerHistorial: vi.fn(),
        administrar: vi.fn(),
        obtenerDatosIndicacion: vi.fn(),
        existeDosisAdministrada: vi.fn(),
    };
}

describe('creación de indicaciones médicas', () => {
    it('guarda una indicación válida con la identidad que recibe del controlador', async () => {
        const repo = crearCaso();
        await expect(new GestionarIndicaciones(repo).crear(datos)).resolves.toBe(23);
        expect(repo.crearIndicacion).toHaveBeenCalledExactlyOnceWith(datos);
    });

    it.each([
        { ...datos, id_paciente: 0 },
        { ...datos, id_insumo: -1 },
        { ...datos, cantidad: 0 },
        { ...datos, cantidad: 1.5 },
        { ...datos, frecuencia_horas: 0 },
        { ...datos, fecha: '2026-02-30' },
        { ...datos, hora_inicio: '25:00' },
    ])('rechaza datos incompletos o inválidos antes de persistir', async entrada => {
        const repo = crearCaso();
        await expect(new GestionarIndicaciones(repo).crear(entrada)).rejects.toMatchObject({ estado_http: 400 });
        expect(repo.crearIndicacion).not.toHaveBeenCalled();
    });
});
