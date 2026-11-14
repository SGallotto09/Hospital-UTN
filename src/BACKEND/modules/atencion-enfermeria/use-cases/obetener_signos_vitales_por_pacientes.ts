import type { SignoVitalRepository } from "../domain/repositories/signo_vital_repository";

export class obtenerSingosVitalesPorPacientes{
    constructor(
        private readonly signoVitalRepository: SignoVitalRepository
    ){}

    async ejecutar(idPaciente: number) {
        return this.signoVitalRepository.obtenerPorPaciente(idPaciente);
    }
}