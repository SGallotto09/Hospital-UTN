import type {
    AntecedenteFamiliarRepository,
    DatosNuevoAntecedente,
} from '../domain/repositories/antecedente_familiar_repository.js';

import type { AntecedenteFamiliar } from '../domain/entities/antecedentes_familiar.js';

export class RegistrarAntecedenteFamiliar {
    constructor(private readonly antecedenteRepository: AntecedenteFamiliarRepository) {}

    async ejecutar(datos: DatosNuevoAntecedente): Promise<AntecedenteFamiliar> {
        if (!Number.isSafeInteger(datos.id_paciente) || datos.id_paciente <= 0) {
            throw new TypeError('El ID del paciente no es válido');
        }

        if (!Number.isSafeInteger(datos.id_medico) || datos.id_medico <= 0) {
            throw new TypeError('El ID del médico no es válido');
        }

        if (typeof datos.parentesco !== 'string' || !datos.parentesco.trim()) {
            throw new TypeError('El parentesco es obligatorio');
        }

        if (typeof datos.enfermedad !== 'string' || !datos.enfermedad.trim()) {
            throw new TypeError('La enfermedad es obligatoria');
        }

        if (datos.observaciones != null && typeof datos.observaciones !== 'string') {
            throw new TypeError('Las observaciones no son válidas');
        }

        if (typeof datos.parentesco === 'string' && datos.parentesco.length > 100)
            throw new TypeError('El campo parentesco supera el limite permitido.');
        if (typeof datos.enfermedad === 'string' && datos.enfermedad.length > 150)
            throw new TypeError('El campo enfermedad supera el limite permitido.');
        if (typeof datos.observaciones === 'string' && datos.observaciones.length > 16000)
            throw new TypeError('El campo observaciones supera el limite permitido.');

        return this.antecedenteRepository.guardar({
            ...datos,
            parentesco: datos.parentesco.trim(),
            enfermedad: datos.enfermedad.trim(),
            observaciones: datos.observaciones?.trim() || null,
        });
    }
}
