import type { EvolucionMedicaRepository } from '../domain/repositories/evolucion_medica_repository.js';

export class ObtenerEvolucionesPorPaciente {
    constructor(private readonly repositorio: EvolucionMedicaRepository) {}

    async ejecutar(idPaciente: number) {
        if (!Number.isSafeInteger(idPaciente) || idPaciente <= 0) {
            throw new Error('El ID del paciente no es válido');
        }
        return this.repositorio.obtenerPorPaciente(idPaciente);
    }
}
