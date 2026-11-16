
import type { Paciente } from "../entities/Paciente.js";

export interface IPacienteRepository {

    // Buscar un paciente por su identificador
    buscarPorId(id: number): Promise<Paciente | null>;

    // Buscar un paciente por su DNI
    buscarPorDni(dni: string): Promise<Paciente | null>;

    // Obtener todos los pacientes registrados
    listarTodos(): Promise<Paciente[]>;

    // Registrar un nuevo paciente
    guardar(paciente: Paciente): Promise<Paciente>;

    // Actualizar los datos de un paciente
    actualizar(paciente: Paciente): Promise<void>;
}
