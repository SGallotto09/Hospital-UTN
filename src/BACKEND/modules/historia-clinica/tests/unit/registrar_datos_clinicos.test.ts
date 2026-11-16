import { describe, expect, it, vi } from 'vitest';
import { RegistrarAlergia } from '../../use-cases/registrar_alergia.js';
import { RegistrarAntecedenteFamiliar } from '../../use-cases/registrar_antecedente_familiar.js';
import { RegistrarEvolucionMedica } from '../../use-cases/registrar_evolucion_medica.js';

describe('Validación de registros clínicos antes de persistir', () => {
    const alergia = {
        id_paciente: 1,
        id_medico: 3,
        sustancia: ' Penicilina ',
        reaccion: ' Erupción ',
        gravedad: 'leve' as const,
        estado: 'activa' as const,
        fecha_deteccion: new Date('2026-11-16T00:00:00'),
    };
    const antecedente = {
        id_paciente: 1,
        id_medico: 3,
        parentesco: ' Padre ',
        enfermedad: ' Diabetes ',
        observaciones: ' ',
    };
    const evolucion = {
        id_paciente: 1,
        id_medico: 3,
        descripcion: ' Estable ',
        diagnostico: ' Control ',
    };

    it.each([
        { id_paciente: 0 },
        { id_paciente: 1.5 },
        { id_medico: -1 },
        { sustancia: '' },
        { reaccion: '' },
        { sustancia: 'x'.repeat(151) },
        { reaccion: 'x'.repeat(201) },
        { gravedad: 'otra' },
        { estado: 'otro' },
        { fecha_deteccion: new Date('inválida') },
    ])('rechaza alergia inválida %j sin llamar a MySQL', async (cambio) => {
        const guardar = vi.fn();
        const caso = new RegistrarAlergia({ guardar, obtenerPorPaciente: vi.fn() });
        await expect(
            caso.ejecutar({ ...alergia, ...cambio } as typeof alergia),
        ).rejects.toBeInstanceOf(TypeError);
        expect(guardar).not.toHaveBeenCalled();
    });

    it.each([
        { id_paciente: 0 },
        { id_medico: 0 },
        { parentesco: '' },
        { enfermedad: '' },
        { parentesco: 'x'.repeat(101) },
        { enfermedad: 'x'.repeat(151) },
        { observaciones: 7 },
    ])('rechaza antecedentes inválidos %j', async (cambio) => {
        const guardar = vi.fn();
        const caso = new RegistrarAntecedenteFamiliar({ guardar, obtenerPorPaciente: vi.fn() });
        await expect(
            caso.ejecutar({ ...antecedente, ...cambio } as typeof antecedente),
        ).rejects.toBeInstanceOf(TypeError);
        expect(guardar).not.toHaveBeenCalled();
    });

    it.each([
        { id_paciente: 0 },
        { id_medico: 0 },
        { descripcion: '' },
        { diagnostico: '' },
        { diagnostico: 'x'.repeat(256) },
        { descripcion: 'x'.repeat(16001) },
    ])('rechaza evoluciones inválidas %j', async (cambio) => {
        const guardar = vi.fn();
        const caso = new RegistrarEvolucionMedica({ guardar, obtenerPorPaciente: vi.fn() });
        await expect(caso.ejecutar({ ...evolucion, ...cambio })).rejects.toBeInstanceOf(TypeError);
        expect(guardar).not.toHaveBeenCalled();
    });

    it('normaliza los campos y conserva al paciente y al médico', async () => {
        const guardar = vi.fn().mockResolvedValue({ id: 9 });
        const repo = { guardar, obtenerPorPaciente: vi.fn() };
        await new RegistrarAlergia(repo).ejecutar(alergia);
        expect(guardar).toHaveBeenLastCalledWith({
            ...alergia,
            sustancia: 'Penicilina',
            reaccion: 'Erupción',
        });
        await new RegistrarAntecedenteFamiliar(repo).ejecutar(antecedente);
        expect(guardar).toHaveBeenLastCalledWith({
            ...antecedente,
            parentesco: 'Padre',
            enfermedad: 'Diabetes',
            observaciones: null,
        });
        await new RegistrarEvolucionMedica(repo).ejecutar(evolucion);
        expect(guardar).toHaveBeenLastCalledWith({
            ...evolucion,
            descripcion: 'Estable',
            diagnostico: 'Control',
        });
    });
});
