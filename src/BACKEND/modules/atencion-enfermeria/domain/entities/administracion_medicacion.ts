
export interface AdministracionMedicacion {
    id_indicacion_medica: number;
    id_paciente: number;
    nombre: string;
    apellido: string;
    habitacion: number;
    medicamento: string;
    cantidad: number;
    fecha: Date;
    hora_inicio: string;
    frecuencia_horas: number;
    estado: 'Pendiente' | 'Administrada';
}
