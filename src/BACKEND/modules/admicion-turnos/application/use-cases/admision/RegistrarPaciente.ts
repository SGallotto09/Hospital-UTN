
import { Paciente } from "../../../domain/entities/Paciente";

import type {
    IPacienteRepository
} from "../../../domain/repositories/IPacienteRepository";


export interface RegistrarPacienteDTO {

    nombre: string;
    apellido: string;
    dni: string;
    fechaNacimiento: string;
    genero: string;
    telefono: string;
    email: string;
    obraSocial: number;

}


export class RegistrarPaciente {

    constructor(
        private readonly pacienteRepository: IPacienteRepository
    ) {}


    async ejecutar(datos: RegistrarPacienteDTO): Promise<Paciente> {

        // 1. Construir y validar la entidad
        const paciente = Paciente.crear(datos);


        // 2. Verificar si el DNI ya está registrado
        const pacienteExistente =
            await this.pacienteRepository.buscarPorDni(paciente.dni);

        if (pacienteExistente) {
            throw new Error(
                "Ya existe un paciente registrado con ese DNI."
            );
        }


        // 3. Guardar el paciente
        return await this.pacienteRepository.guardar(paciente);

    }
}
