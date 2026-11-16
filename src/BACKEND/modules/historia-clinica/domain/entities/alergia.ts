export interface Alergia {
    id: number;
    id_paciente: number;
    sustancia: string;
    reaccion: string;
    gravedad: 'leve' | 'moderada' | 'grave';
    fecha_deteccion: Date;
    estado: 'activa' | 'descartada';
    id_medico: number;
    fecha_registro: Date;
}
