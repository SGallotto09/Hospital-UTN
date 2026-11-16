
import type { ProtocoloAtencion } from '../entities/protocolo_atencion.js';
import type { ProtocoloBuilder } from './protocolo_builder.js';

export class PreOpProtocolBuilder implements ProtocoloBuilder {
    private protocolo!: ProtocoloAtencion;

    reiniciar(id_paciente: number): void {
        this.protocolo = {
            id_paciente,
            tipo_protocolo: 'Prequirurgico',
            tareas: [],
            fecha_generacion: new Date()
        };

        this.agregar_tarea('Verificar ayuno de 8 horas');
        this.agregar_tarea('Colocar vía intravenosa periférica');
        this.agregar_tarea('Realizar control de signos vitales cada 2 horas');
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
