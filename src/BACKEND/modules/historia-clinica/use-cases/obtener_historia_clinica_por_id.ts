
import type { HistoriaClinicaRepository } from "../domain/repositories/historia_clinica_repository.js";
import type { HistoriaClinica } from "../domain/entities/historia_clinica.js";

export class ObtenerHistoriaClinicaPorId {
    constructor(
        private readonly historiaClinicaRepository: HistoriaClinicaRepository
    ){}

    async ejecutar(id: number): Promise<HistoriaClinica | null> {
        if (!Number.isSafeInteger(id) || id <= 0) {
            throw new Error("El ID de la historia clínica no es válido");
        }

        return this.historiaClinicaRepository.obtenerPorId(id);
    }
}
