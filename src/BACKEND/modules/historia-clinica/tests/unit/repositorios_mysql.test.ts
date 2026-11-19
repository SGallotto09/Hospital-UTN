import { beforeEach, describe, expect, it, vi } from 'vitest';
const conexion = vi.hoisted(() => ({
    beginTransaction: vi.fn(),
    commit: vi.fn(),
    rollback: vi.fn(),
    release: vi.fn(),
    destroy: vi.fn(),
    execute: vi.fn(),
}));
vi.mock('mysql2/promise', () => ({
    default: {
        createPool: () => ({ getConnection: async () => conexion, execute: vi.fn() }),
    },
}));
import { AlergiaRepositoryMySQL } from '../../infraestructure/repositories/alergia_repository_mysql.js';
import { AntecedenteFamiliarRepositoryMySQL } from '../../infraestructure/repositories/antecedente_familiar_repository_mysql.js';
import { EvolucionMedicaRepositoryMySQL } from '../../infraestructure/repositories/evolucion_medica_repository_mysql.js';

describe('Registros clínicos con withTransaction real y conexión MySQL simulada', () => {
    const registros = [
        {
            nombre: 'AlergiaRepositoryMySQL',
            guardar: () =>
                new AlergiaRepositoryMySQL().guardar({
                    id_paciente: 1,
                    id_medico: 3,
                    sustancia: "' OR 1=1 --",
                    reaccion: 'Erupción',
                    gravedad: 'leve' as const,
                    estado: 'activa' as const,
                    fecha_deteccion: new Date('2026-11-16T00:00:00'),
                }),
        },
        {
            nombre: 'AntecedenteFamiliarRepositoryMySQL',
            guardar: () =>
                new AntecedenteFamiliarRepositoryMySQL().guardar({
                    id_paciente: 1,
                    id_medico: 3,
                    parentesco: 'Padre',
                    enfermedad: 'Diabetes',
                    observaciones: null,
                }),
        },
        {
            nombre: 'EvolucionMedicaRepositoryMySQL',
            guardar: () =>
                new EvolucionMedicaRepositoryMySQL().guardar({
                    id_paciente: 1,
                    id_medico: 3,
                    descripcion: 'Estable',
                    diagnostico: 'Control',
                }),
        },
    ];
    beforeEach(() => {
        vi.clearAllMocks();
        conexion.execute.mockReset();
        conexion.execute
            .mockResolvedValueOnce([{ insertId: 9 }, []])
            .mockResolvedValueOnce([[{ id: 9 }], []]);
    });
    it('revierte la versión nueva si falla la escritura del vínculo de rectificación', async () => {
        conexion.execute.mockReset();
        conexion.execute
            .mockResolvedValueOnce([[{ id: 5 }], []])
            .mockResolvedValueOnce([[], []])
            .mockResolvedValueOnce([{ insertId: 9 }, []])
            .mockResolvedValueOnce([[{ id: 9 }], []])
            .mockRejectedValueOnce(new Error('Vínculo fallido'));

        await expect(
            new AlergiaRepositoryMySQL().rectificar(5, {
                id_paciente: 1,
                id_medico: 3,
                sustancia: 'Penicilina',
                reaccion: 'Erupción',
                gravedad: 'leve',
                estado: 'descartada',
                fecha_deteccion: new Date('2026-11-16T00:00:00'),
            }, 'Antecedente reevaluado'),
        ).rejects.toThrow('Vínculo fallido');
        expect(conexion.rollback).toHaveBeenCalledOnce();
        expect(conexion.commit).not.toHaveBeenCalled();
    });
    for (const { nombre, guardar } of registros) {
        it(`${nombre}: confirma inserción y lectura en la misma conexión`, async () => {
            expect(await guardar()).toEqual({ id: 9 });
            expect(conexion.beginTransaction).toHaveBeenCalledOnce();
            expect(conexion.commit).toHaveBeenCalledOnce();
            expect(conexion.rollback).not.toHaveBeenCalled();
            expect(conexion.release).toHaveBeenCalledOnce();
            expect(conexion.execute.mock.calls[0]![0]).not.toContain("' OR 1=1 --");
            expect(conexion.execute.mock.calls[0]![1]).toContain(3);
        });
        it(`${nombre}: revierte si falla la lectura posterior`, async () => {
            conexion.execute.mockReset();
            conexion.execute
                .mockResolvedValueOnce([{ insertId: 9 }, []])
                .mockRejectedValueOnce(new Error('Lectura fallida'));
            await expect(guardar()).rejects.toThrow('Lectura fallida');
            expect(conexion.rollback).toHaveBeenCalledOnce();
            expect(conexion.commit).not.toHaveBeenCalled();
            expect(conexion.release).toHaveBeenCalledOnce();
        });
        it(`${nombre}: propaga la clave foránea inválida sin confirmar`, async () => {
            conexion.execute.mockReset();
            const error = Object.assign(new Error('Referencia inválida'), {
                code: 'ER_NO_REFERENCED_ROW_2',
            });
            conexion.execute.mockRejectedValueOnce(error);
            await expect(guardar()).rejects.toBe(error);
            expect(conexion.execute).toHaveBeenCalledOnce();
            expect(conexion.rollback).toHaveBeenCalledOnce();
            expect(conexion.commit).not.toHaveBeenCalled();
        });
    }
});
