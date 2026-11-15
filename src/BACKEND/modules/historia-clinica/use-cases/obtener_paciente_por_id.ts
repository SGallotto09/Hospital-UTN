import type { PacienteRepository } from "../domain/repositories/paciente_repository.js";
import type { Paciente } from "../domain/entities/paciente.js";

export class ObtenerPacientePorId {
    constructor(
        private readonly pacienteRepository: PacienteRepository
    ){}

    async ejecutar(id: number): Promise<Paciente | null> {
        if(id <= 0){
            throw new Error("El ID del paciente debe ser mayor a cero");
        }

        return this.pacienteRepository.obtenerPorId(id);
    }
}
