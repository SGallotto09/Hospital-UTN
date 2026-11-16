import { describe, expect, it } from 'vitest';
import { ObtenerHistoriaClinicaCompleta } from '../../use-cases/obtener_historia_clinica_completa.js';

describe('ObtenerHistoriaClinicaCompleta', () => {
    const paciente = { id: 1, nombre: 'Juan' };
    const pacientes = {
        obtenerPorId: async (id: number) => id === 1 ? paciente : null,
        obtenerPorDni: async () => null,
        obtenerTodos: async () => []
    };
    const alergias = { guardar: async () => { throw new Error(); }, obtenerPorPaciente: async () => [] };
    const antecedentes = { guardar: async () => { throw new Error(); }, obtenerPorPaciente: async () => [] };
    const evoluciones = { guardar: async () => { throw new Error(); }, obtenerPorPaciente: async () => [] };
    const estudios = { obtenerPorPaciente: async () => [] };
    const caso = new ObtenerHistoriaClinicaCompleta(
        pacientes as never,
        alergias as never,
        antecedentes as never,
        evoluciones as never,
        estudios
    );

    it('reúne los datos del paciente', async () => {
        const resultado = await caso.ejecutar(1);
        expect(resultado?.paciente).toEqual(paciente);
        expect(resultado?.alergias).toEqual([]);
        expect(resultado?.estudiosClinicos).toEqual([]);
    });

    it('devuelve null si no existe el paciente', async () => {
        expect(await caso.ejecutar(2)).toBeNull();
    });

    it('rechaza ID inválidos', async () => {
        await expect(caso.ejecutar(0)).rejects.toThrow();
    });
});
