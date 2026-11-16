import type {
    AntecedenteFamiliarRepository,
    DatosNuevoAntecedente
} from '../domain/repositories/antecedente_familiar_repository.js';

import type { AntecedenteFamiliar } from '../domain/entities/antecedentes_familiar.js';

export class RegistrarAntecedenteFamiliar {
    constructor(
        private readonly antecedenteRepository: AntecedenteFamiliarRepository
    ){}

    async ejecutar(datos: DatosNuevoAntecedente): Promise<AntecedenteFamiliar> {
        if (!Number.isSafeInteger(datos.id_paciente) || datos.id_paciente <= 0) {
            throw new Error('El ID del paciente no es válido');
        }

        if (!Number.isSafeInteger(datos.id_medico) || datos.id_medico <= 0) {
            throw new Error('El ID del médico no es válido');
        }

        if (typeof datos.parentesco !== 'string' || !datos.parentesco.trim()) {
            throw new Error('El parentesco es obligatorio');
        }

        if (typeof datos.enfermedad !== 'string' || !datos.enfermedad.trim()) {
            throw new Error('La enfermedad es obligatoria');
        }

        if (datos.observaciones != null &&
            typeof datos.observaciones !== 'string') {
            throw new Error('Las observaciones no son válidas');
        }

        return this.antecedenteRepository.guardar({
            ...datos,
            parentesco: datos.parentesco.trim(),
            enfermedad: datos.enfermedad.trim(),
            observaciones: datos.observaciones?.trim() || null
        });
    }
}
