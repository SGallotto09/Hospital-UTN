
import type { EstadoTriaje } from "../../../domain/entities/Triaje.js";
import type { ITriajeRepository } from "../../../domain/repositories/ITriajeRepository.js";

interface CambiarEstadoTriajeDTO {
    id: number;
    nuevoEstado: EstadoTriaje;
}

export class CambiarEstadoTriaje {
    constructor(
        private readonly repository: ITriajeRepository
    ) {}

    async ejecutar(datos: CambiarEstadoTriajeDTO): Promise<void> {
        if (
            !Number.isSafeInteger(datos.id) ||
            datos.id <= 0
        ) {
            throw new Error("El identificador del triaje no es válido.");
        }

        const triaje = await this.repository.buscarPorId(datos.id);

        if (!triaje) {
            throw new Error("No se encontró el triaje solicitado.");
        }

        switch (datos.nuevoEstado) {
            case "EN_ATENCION":
                triaje.iniciarAtencion();
                break;

            case "ATENDIDO":
                triaje.finalizarAtencion();
                break;

            default:
                throw new Error(
                    "El estado solicitado no permite esta operación."
                );
        }

        await this.repository.actualizar(triaje);
    }
}
