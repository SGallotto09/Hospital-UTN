import type { AntecedenteFamiliarRepository } from '../domain/repositories/antecedente_familiar_repository.js';

export class ObtenerAntecedentesPorPaciente {
    constructor(private readonly repositorio: AntecedenteFamiliarRepository) {}

    async ejecutar(idPaciente: number) {
        if (!Number.isSafeInteger(idPaciente) || idPaciente <= 0) {
            throw new Error('El ID del paciente no es válido');
        }
        return this.repositorio.obtenerPorPaciente(idPaciente);
    }
}
