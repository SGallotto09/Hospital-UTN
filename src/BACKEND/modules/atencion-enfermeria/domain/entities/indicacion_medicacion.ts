
export interface IndicacionMedicacion {
    id_indicacion_medica: number;
    id_paciente: number;
    nombre: string;
    apellido: string;
    habitacion: number;
    medicamento: string;
    cantidad: number;
    fecha: string;
    hora_inicio: string;
    frecuencia_horas: number;
}
