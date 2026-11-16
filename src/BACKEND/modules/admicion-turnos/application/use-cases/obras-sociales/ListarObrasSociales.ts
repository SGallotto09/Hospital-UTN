import type { ObraSocial } from "../../../domain/entities/ObraSocial.js";

import type {
    IObraSocialRepository
} from "../../../domain/repositories/IObraSocialRepository.js";


export class ListarObrasSociales {

    constructor(
        private readonly obraSocialRepository: IObraSocialRepository
    ) {}


    async ejecutar(): Promise<ObraSocial[]> {

        return await this.obraSocialRepository.listarTodos();

    }

}