import type { Paciente } from "../entities/paciente.js";

export interface PacienteRepository {

    obtenerTodos(): Promise<Paciente[]>;

    obtenerPorId(id: number): Promise<Paciente | null>;

    obtenerPorDni(dni: string): Promise<Paciente | null>;

}
