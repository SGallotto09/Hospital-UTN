import type { AlergiaRepository } from '../domain/repositories/alergia_repository.js';
import type { Alergia } from '../domain/entities/alergia.js';

export class ObtenerAlergiasPorPaciente {
    constructor(private readonly alergiaRepository: AlergiaRepository) {}

    async ejecutar(idPaciente: number): Promise<Alergia[]> {
        if (!Number.isSafeInteger(idPaciente) || idPaciente <= 0) {
            throw new Error('El ID del paciente no es válido');
        }

        return this.alergiaRepository.obtenerPorPaciente(idPaciente);
    }
}
