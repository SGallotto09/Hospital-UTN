import type { PacienteRepository } from '../domain/repositories/paciente_repository.js';

export class ObtenerPacientes {
    constructor(private readonly pacienteRepository: PacienteRepository) {}

    async ejecutar() {
        return this.pacienteRepository.obtenerTodos();
    }
}
