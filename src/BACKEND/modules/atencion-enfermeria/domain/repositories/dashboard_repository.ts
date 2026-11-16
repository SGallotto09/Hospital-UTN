export interface PacienteDashboard {
    id: number;
    nombre: string;
    apellido: string;
    habitacion: number;
    piso: number;
    presion_arterial: string | null;
    frecuencia_cardiaca: number | null;
    temperatura: number | null;
    fecha_hora: Date | null;
}

export interface DashboardRepository {
    obtenerPacientes(): Promise<PacienteDashboard[]>;
}