
export interface DosisProgramada {
    id_indicacion_medica: number;
    id_paciente: number;
    nombre: string;
    apellido: string;
    habitacion: number;
    medicamento: string;
    cantidad: number;
    horario_programado: Date;
    estado: 'Futura' | 'Pendiente' | 'Administrada';
}
