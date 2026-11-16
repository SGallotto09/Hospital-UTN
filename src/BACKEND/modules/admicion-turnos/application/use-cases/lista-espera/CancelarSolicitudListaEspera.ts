
import type {
    IListaEsperaRepository
} from "../../../domain/repositories/IListaEsperaRepository.js";

import type {
    ListaEspera
} from "../../../domain/entities/ListaEspera.js";

export interface CancelarSolicitudListaEsperaDTO {
    id: number;
}

export class CancelarSolicitudListaEspera {

    constructor(
        private readonly repository: IListaEsperaRepository
    ) {}

    async ejecutar(
        datos: CancelarSolicitudListaEsperaDTO
    ): Promise<ListaEspera> {

        if (
            !Number.isSafeInteger(datos.id) ||
            datos.id <= 0
        ) {
            throw new Error(
                "El identificador de la solicitud no es válido."
            );
        }

        const solicitud = await this.repository.buscarPorId(datos.id);

        if (!solicitud) {
            throw new Error(
                "No se encontró la solicitud de lista de espera."
            );
        }

        solicitud.cancelar();

        await this.repository.actualizar(solicitud);

        return solicitud;
    }
    
}
