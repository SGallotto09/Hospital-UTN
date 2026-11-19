import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SignoVitalRepositoryMySQL } from '../../infraestructure/repositories/signo_vital_repository_mysql.js';

const mocks = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock('mysql2/promise', () => ({ default: { createPool: () => ({ execute: mocks.execute }) } }));

beforeEach(() => vi.resetAllMocks());

describe('persistencia de signos vitales', () => {
    it('rechaza registrar signos para un paciente sin internación activa', async () => {
        mocks.execute.mockResolvedValueOnce([[], []]);

        await expect(new SignoVitalRepositoryMySQL().guardar({
            id_paciente: 4,
            id_enfermero: 7,
            presion_arterial: '120/80',
            frecuencia_cardiaca: 72,
            temperatura: 36.5
        })).rejects.toMatchObject({ estado_http: 404 });

        expect(mocks.execute).toHaveBeenCalledOnce();
        expect(String(mocks.execute.mock.calls[0]?.[0])).toContain('fecha_egreso IS NULL');
    });

    it('rechaza registrar signos si el paciente tiene internaciones activas ambiguas', async () => {
        mocks.execute.mockResolvedValueOnce([[{ id: 2 }, { id: 3 }], []]);

        await expect(new SignoVitalRepositoryMySQL().guardar({
            id_paciente: 4,
            id_enfermero: 7,
            presion_arterial: '120/80',
            frecuencia_cardiaca: 72,
            temperatura: 36.5
        })).rejects.toMatchObject({ estado_http: 409 });

        expect(mocks.execute).toHaveBeenCalledOnce();
    });

    it('asocia el registro al paciente y enfermero recibidos después de validar la internación activa', async () => {
        const signoVital = {
            id: 15,
            id_paciente: 4,
            id_enfermero: 7,
            presion_arterial: '120/80',
            frecuencia_cardiaca: 72,
            temperatura: 36.5,
            fecha_hora: new Date('2026-11-19T12:00:00Z')
        };
        mocks.execute
            .mockResolvedValueOnce([[{ id: 2 }], []])
            .mockResolvedValueOnce([{ insertId: 15 }, []])
            .mockResolvedValueOnce([[signoVital], []]);

        await expect(new SignoVitalRepositoryMySQL().guardar({
            id_paciente: 4,
            id_enfermero: 7,
            presion_arterial: '120/80',
            frecuencia_cardiaca: 72,
            temperatura: 36.5
        })).resolves.toEqual(signoVital);

        expect(mocks.execute.mock.calls[1]?.[1]).toEqual([4, 7, '120/80', 72, 36.5]);
    });
});
