export interface SignoVital{
    id: number;
    id_paciente: number;
    id_enfermero: number;
    presion_arterial: string;
    frecuencia_cardiaca: number;
    temperatura: number;
    fecha_hora: Date;
}