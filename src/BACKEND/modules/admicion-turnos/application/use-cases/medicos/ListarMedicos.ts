import type { Medico } from "../../../domain/entities/Medico.js";
import type { IMedicoRepository } from "../../../domain/repositories/IMedicoRepository.js";

export class ListarMedicos {
    constructor(
        private readonly medicoRepository: IMedicoRepository
    ) {}

    async ejecutar(): Promise<Medico[]> {
        return this.medicoRepository.listarTodos();
    }
}