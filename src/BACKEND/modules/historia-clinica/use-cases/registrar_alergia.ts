import type {
    AlergiaRepository,
    DatosNuevaAlergia,
} from '../domain/repositories/alergia_repository.js';

import type { Alergia } from '../domain/entities/alergia.js';

export class RegistrarAlergia {
    constructor(private readonly alergiaRepository: AlergiaRepository) {}

    async ejecutar(datos: DatosNuevaAlergia): Promise<Alergia> {
        if (!Number.isSafeInteger(datos.id_paciente) || datos.id_paciente <= 0) {
            throw new TypeError('El ID del paciente no es válido');
        }

        if (!Number.isSafeInteger(datos.id_medico) || datos.id_medico <= 0) {
            throw new TypeError('El ID del médico no es válido');
        }

        if (typeof datos.sustancia !== 'string' || !datos.sustancia.trim()) {
            throw new TypeError('La sustancia es obligatoria');
        }

        if (typeof datos.reaccion !== 'string' || !datos.reaccion.trim()) {
            throw new TypeError('La reacción es obligatoria');
        }

        if (!['leve', 'moderada', 'grave'].includes(datos.gravedad)) {
            throw new TypeError('La gravedad no es válida');
        }

        if (!['activa', 'descartada'].includes(datos.estado)) {
            throw new TypeError('El estado no es válido');
        }

        if (
            !(datos.fecha_deteccion instanceof Date) ||
            Number.isNaN(datos.fecha_deteccion.getTime())
        ) {
            throw new TypeError('La fecha de detección no es válida');
        }

        if (typeof datos.sustancia === 'string' && datos.sustancia.length > 150)
            throw new TypeError('El campo sustancia supera el limite permitido.');
        if (typeof datos.reaccion === 'string' && datos.reaccion.length > 200)
            throw new TypeError('El campo reaccion supera el limite permitido.');

        return this.alergiaRepository.guardar({
            ...datos,
            sustancia: datos.sustancia.trim(),
            reaccion: datos.reaccion.trim(),
        });
    }
}
