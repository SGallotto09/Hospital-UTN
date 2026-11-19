import type {
    EvolucionMedicaRepository,
    DatosNuevaEvolucion,
} from '../domain/repositories/evolucion_medica_repository.js';

export class RegistrarEvolucionMedica {
    constructor(private readonly repositorio: EvolucionMedicaRepository) {}

    async ejecutar(datos: DatosNuevaEvolucion) {
        if (!Number.isSafeInteger(datos.id_paciente) || datos.id_paciente <= 0)
            throw new TypeError('El ID del paciente no es válido');
        if (!Number.isSafeInteger(datos.id_medico) || datos.id_medico <= 0)
            throw new TypeError('El ID del médico no es válido');
        if (typeof datos.descripcion !== 'string' || !datos.descripcion.trim())
            throw new TypeError('La descripción es obligatoria');
        if (typeof datos.diagnostico !== 'string' || !datos.diagnostico.trim())
            throw new TypeError('El diagnóstico es obligatorio');
        if (typeof datos.diagnostico === 'string' && datos.diagnostico.length > 255)
            throw new TypeError('El campo diagnostico supera el limite permitido.');
        if (typeof datos.descripcion === 'string' && datos.descripcion.length > 16000)
            throw new TypeError('El campo descripcion supera el limite permitido.');

        return this.repositorio.guardar({
            ...datos,
            descripcion: datos.descripcion.trim(),
            diagnostico: datos.diagnostico.trim(),
        });
    }
}
