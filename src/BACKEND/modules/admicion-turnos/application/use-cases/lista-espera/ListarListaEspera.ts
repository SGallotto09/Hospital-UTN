import type {
    ListaEspera,
    EstadoListaEspera
} from "../../../domain/entities/ListaEspera.js";

import type {
    IListaEsperaRepository
} from "../../../domain/repositories/IListaEsperaRepository.js";

export class ListarListaEspera {

    constructor(
        private readonly repository: IListaEsperaRepository
    ) {}

    async ejecutar(
        estado?: EstadoListaEspera
    ): Promise<ListaEspera[]> {

        if (
            estado !== undefined &&
            estado !== "EN_ESPERA" &&
            estado !== "ASIGNADO"
        ) {
            throw new Error("El estado solicitado no es válido.");
        }

        return this.repository.listarTodos(estado);
    }
}