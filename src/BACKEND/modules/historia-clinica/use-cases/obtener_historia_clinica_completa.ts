import type { PacienteRepository } from '../domain/repositories/paciente_repository.js';
import type { AlergiaRepository } from '../domain/repositories/alergia_repository.js';
import type { AntecedenteFamiliarRepository } from '../domain/repositories/antecedente_familiar_repository.js';
import type { EvolucionMedicaRepository } from '../domain/repositories/evolucion_medica_repository.js';
import type { EstudioClinicoRepository } from '../domain/repositories/estudio_clinico_repository.js';

export class ObtenerHistoriaClinicaCompleta {
    constructor(
        private readonly pacientes: PacienteRepository,
        private readonly alergias: AlergiaRepository,
        private readonly antecedentes: AntecedenteFamiliarRepository,
        private readonly evoluciones: EvolucionMedicaRepository,
        private readonly estudios: EstudioClinicoRepository,
    ) {}

    async ejecutar(idPaciente: number) {
        if (!Number.isSafeInteger(idPaciente) || idPaciente <= 0) {
            throw new Error('El ID del paciente no es válido');
        }

        const paciente = await this.pacientes.obtenerPorId(idPaciente);
        if (!paciente) return null;

        const [alergias, antecedentesFamiliares, evolucionesMedicas, estudiosClinicos] =
            await Promise.all([
                this.alergias.obtenerPorPaciente(idPaciente),
                this.antecedentes.obtenerPorPaciente(idPaciente),
                this.evoluciones.obtenerPorPaciente(idPaciente),
                this.estudios.obtenerPorPaciente(idPaciente),
            ]);

        return { paciente, alergias, antecedentesFamiliares, evolucionesMedicas, estudiosClinicos };
    }
}
