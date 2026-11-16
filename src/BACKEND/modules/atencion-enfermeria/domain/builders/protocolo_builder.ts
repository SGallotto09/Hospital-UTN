import type { ProtocoloAtencion } from '../entities/protocolo_atencion.js';

export interface ProtocoloBuilder {
    reiniciar(id_paciente: number): void;
    agregar_tarea(descripcion: string): void;
    obtener_protocolo(): ProtocoloAtencion;
}