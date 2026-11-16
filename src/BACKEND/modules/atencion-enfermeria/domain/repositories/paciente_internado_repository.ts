import { PacienteInternado } from "../entities/paciente_internado.js";

export interface PacienteInternadoRepository{
    obtenerInternados(buscar?: string): Promise<Omit<PacienteInternado, 'estado'>[]>;
}