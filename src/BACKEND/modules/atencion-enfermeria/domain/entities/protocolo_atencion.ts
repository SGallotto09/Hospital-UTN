import type { TareaEnfermeria } from './tarea_enfermeria.js';

export type TipoProtocolo = 'Prequirurgico' | 'Respiratorio';

export interface ProtocoloAtencion {
    id?: number;
    id_paciente: number;
    tipo_protocolo: TipoProtocolo;
    tareas: TareaEnfermeria[];
    fecha_generacion: Date;
}