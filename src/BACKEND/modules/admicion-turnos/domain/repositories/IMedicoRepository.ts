import type { Medico } from "../entities/Medico.js";

export interface IMedicoRepository {
    listarTodos(): Promise<Medico[]>;
}