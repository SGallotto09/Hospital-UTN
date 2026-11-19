export interface AntecedenteFamiliar {
    id: number;
    id_paciente: number;
    parentesco: string;
    enfermedad: string;
    observaciones: string | null;
    id_medico: number;
    fecha_registro: Date;
}
