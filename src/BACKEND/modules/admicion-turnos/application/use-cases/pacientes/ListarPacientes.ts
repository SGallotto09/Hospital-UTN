
import type { Paciente } from "../../../domain/entities/Paciente.js";

import type {
    IPacienteRepository
} from "../../../domain/repositories/IPacienteRepository.js";


export class ListarPacientes {

    constructor(
        private readonly pacienteRepository: IPacienteRepository
    ) {}


    async ejecutar(): Promise<Paciente[]> {

        return await this.pacienteRepository.listarTodos();

    }
}
