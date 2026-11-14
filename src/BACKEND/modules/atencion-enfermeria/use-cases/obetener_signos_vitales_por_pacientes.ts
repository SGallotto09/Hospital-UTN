import type { SignoVitalRepository } from "../domain/repositories/signo_vital_repository.js";

export class ObtenerSingosVitalesPorPacientes{
    constructor(
        private readonly signoVitalRepository: SignoVitalRepository
    ){}

    async ejecutar(idPaciente: number) {
        return this.signoVitalRepository.obtenerPorPaciente(idPaciente);
    }
}