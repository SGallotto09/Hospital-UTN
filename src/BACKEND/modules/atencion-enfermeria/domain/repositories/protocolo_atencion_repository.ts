
import type { ProtocoloAtencion } from '../entities/protocolo_atencion.js';

export interface ProtocoloAtencionRepository {
    guardar(protocolo: ProtocoloAtencion): Promise<number>;
    obtenerPorPaciente(id_paciente: number): Promise<ProtocoloAtencion[]>;
    actualizarEstadoTarea(
        id_tarea: number,
        estado: 'Pendiente' | 'Completada'
    ): Promise<void>;
}
