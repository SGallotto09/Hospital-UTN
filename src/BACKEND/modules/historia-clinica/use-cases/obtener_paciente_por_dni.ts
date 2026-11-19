import type { PacienteRepository } from '../domain/repositories/paciente_repository.js';
import type { Paciente } from '../domain/entities/paciente.js';

export class ObtenerPacientePorDni {
    constructor(private readonly pacienteRepository: PacienteRepository) {}

    async ejecutar(dni: string): Promise<Paciente | null> {
        if (typeof dni !== 'string' || !dni.trim()) {
            throw new Error('El DNI del paciente es obligatorio');
        }

        return this.pacienteRepository.obtenerPorDni(dni.trim());
    }
}
