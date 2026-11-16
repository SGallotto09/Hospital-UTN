import type { ObraSocial } from "../entities/ObraSocial.js";

export interface IObraSocialRepository {

    listarTodos(): Promise<ObraSocial[]>;

}