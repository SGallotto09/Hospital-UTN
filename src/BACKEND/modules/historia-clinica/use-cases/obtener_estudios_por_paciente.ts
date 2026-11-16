import type { EstudioClinicoRepository } from '../domain/repositories/estudio_clinico_repository.js';

export class ObtenerEstudiosPorPaciente {
    constructor(private readonly repositorio: EstudioClinicoRepository) {}

    async ejecutar(idPaciente: number) {
        if (!Number.isSafeInteger(idPaciente) || idPaciente <= 0) {
            throw new Error('El ID del paciente no es válido');
        }
        return this.repositorio.obtenerPorPaciente(idPaciente);
    }
}
