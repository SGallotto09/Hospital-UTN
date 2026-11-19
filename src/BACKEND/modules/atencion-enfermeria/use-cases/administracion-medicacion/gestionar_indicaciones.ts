import { ErrorEnfermeria } from '../../domain/errors/error_enfermeria.js';

interface IndicacionesRepository {
    obtenerOpcionesIndicacion(): Promise<{
        pacientes: { id: number; nombre: string; apellido: string }[];
        insumos: { id: number; nombre: string }[];
    }>;
    crearIndicacion(datos: NuevaIndicacionMedica): Promise<number>;
    obtenerHistorial(): Promise<{
        id: number;
        nombre: string;
        apellido: string;
        medicamento: string;
        cantidad: number;
        fecha_hora: Date;
        enfermero: string;
    }[]>;
}

export interface NuevaIndicacionMedica {
    id_medico: number;
    id_paciente: number;
    id_insumo: number;
    cantidad: number;
    fecha: string;
    hora_inicio: string;
    frecuencia_horas: number;
}

function esFechaValida(fecha: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
    const valor = new Date(`${fecha}T00:00:00Z`);
    return !Number.isNaN(valor.getTime()) && valor.toISOString().slice(0, 10) === fecha;
}

export class GestionarIndicaciones {
    constructor(private readonly repository: IndicacionesRepository) {}

    obtenerOpciones() {
        return this.repository.obtenerOpcionesIndicacion();
    }

    obtenerHistorial() {
        return this.repository.obtenerHistorial();
    }

    async crear(datos: NuevaIndicacionMedica): Promise<number> {
        if (!Number.isSafeInteger(datos.id_medico) || datos.id_medico <= 0 ||
            !Number.isSafeInteger(datos.id_paciente) || datos.id_paciente <= 0 ||
            !Number.isSafeInteger(datos.id_insumo) || datos.id_insumo <= 0) {
            throw new ErrorEnfermeria('El paciente, el insumo y el médico deben ser válidos.', 400);
        }
        if (!Number.isSafeInteger(datos.cantidad) || datos.cantidad <= 0) {
            throw new ErrorEnfermeria('La cantidad debe ser un entero positivo.', 400);
        }
        if (!Number.isSafeInteger(datos.frecuencia_horas) || datos.frecuencia_horas <= 0) {
            throw new ErrorEnfermeria('La frecuencia debe ser un entero positivo.', 400);
        }
        if (!esFechaValida(datos.fecha) || !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(datos.hora_inicio)) {
            throw new ErrorEnfermeria('La fecha y la hora de inicio deben ser válidas.', 400);
        }
        return this.repository.crearIndicacion(datos);
    }
}
