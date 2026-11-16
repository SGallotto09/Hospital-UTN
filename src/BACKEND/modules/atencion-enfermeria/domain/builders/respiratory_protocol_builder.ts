
import type { ProtocoloAtencion } from '../entities/protocolo_atencion.js';
import type { ProtocoloBuilder } from './protocolo_builder.js';

export class RespiratoryProtocolBuilder implements ProtocoloBuilder {
    private protocolo!: ProtocoloAtencion;

    reiniciar(id_paciente: number): void {
        this.protocolo = {
            id_paciente,
            tipo_protocolo: 'Respiratorio',
            tareas: [],
            fecha_generacion: new Date()
        };

        this.agregar_tarea('Monitoreo de saturación de oxígeno continuo');
        this.agregar_tarea('Indicación de aislamiento de contacto y gotas');
    }

    agregar_tarea(descripcion: string): void {
        this.protocolo.tareas.push({
            descripcion,
            estado: 'Pendiente'
        });
    }

    obtener_protocolo(): ProtocoloAtencion {
        return this.protocolo;
    }
}
