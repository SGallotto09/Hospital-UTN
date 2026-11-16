export interface EstudioClinico {
    id: number;
    id_paciente: number;
    tipo_estudio: string;
    descripcion: string | null;
    resultado: string | null;
    id_medico: number;
    fecha_registro: Date;
}
