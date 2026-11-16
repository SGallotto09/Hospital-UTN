export interface PacienteInternado{
    id: number;
    nombre: string;
    apellido: string;
    habitacion: number;
    piso: number;
    fecha_ingreso: Date;

    presion_arterial: string | null;
    frecuencia_cardiaca: number | null;
    temperatura: number | null;


    estado: 'Estable' | 'Requiere atención'| 'Sin registro';
}