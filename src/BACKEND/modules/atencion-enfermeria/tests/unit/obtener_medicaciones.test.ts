import { afterEach, describe, expect, it, vi } from 'vitest';
import { ObtenerMedicaciones } from '../../use-cases/administracion-medicacion/obtener_medicaciones.js';

afterEach(() => vi.useRealTimers());

describe('generación de dosis programadas', () => {
    it('marca la próxima dosis futura como programada, no pendiente de administrar', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-12-01T07:00:00'));
        const repository = {
            obtenerTodas: vi.fn().mockResolvedValue([{
                id_indicacion_medica: 3, id_paciente: 8, nombre: 'Ana', apellido: 'Prueba',
                habitacion: 12, medicamento: 'Insumo', cantidad: 1,
                fecha: '2026-12-01', hora_inicio: '08:00:00', frecuencia_horas: 8,
            }]),
            administrar: vi.fn(),
            obtenerDatosIndicacion: vi.fn(),
            existeDosisAdministrada: vi.fn(),
        };
        const dosis = await new ObtenerMedicaciones(repository).ejecutar();
        expect(dosis).toHaveLength(1);
        expect(dosis[0]?.estado).toBe('Futura');
        expect(repository.existeDosisAdministrada).not.toHaveBeenCalled();
    });

    it('deja administrable solo la dosis actual y marca la siguiente como futura', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-12-01T08:10:00'));
        const repository = {
            obtenerTodas: vi.fn().mockResolvedValue([{
                id_indicacion_medica: 3, id_paciente: 8, nombre: 'Ana', apellido: 'Prueba',
                habitacion: 12, medicamento: 'Insumo', cantidad: 1,
                fecha: '2026-12-01', hora_inicio: '08:00:00', frecuencia_horas: 8,
            }]),
            administrar: vi.fn(),
            obtenerDatosIndicacion: vi.fn(),
            existeDosisAdministrada: vi.fn().mockResolvedValue(false),
        };
        const dosis = await new ObtenerMedicaciones(repository).ejecutar();
        expect(dosis.map(item => item.estado)).toEqual(['Pendiente', 'Futura']);
    });
});
