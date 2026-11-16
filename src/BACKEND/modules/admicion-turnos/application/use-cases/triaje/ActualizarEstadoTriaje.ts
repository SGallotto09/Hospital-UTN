
import type {
    Triaje
} from "../../../domain/entities/Triaje.js";

import type {
    ITriajeRepository
} from "../../../domain/repositories/ITriajeRepository.js";


export type AccionTriaje =
    | "INICIAR_ATENCION"
    | "FINALIZAR_ATENCION";


export interface ActualizarEstadoTriajeDTO {

    idTriaje: number;
    accion: AccionTriaje;

}


export class ActualizarEstadoTriaje {

    constructor(
        private readonly triajeRepository: ITriajeRepository
    ) {}


    async ejecutar(
        datos: ActualizarEstadoTriajeDTO
    ): Promise<Triaje> {

        // 1. Validar el identificador
        if (
            !Number.isSafeInteger(datos.idTriaje) ||
            datos.idTriaje <= 0
        ) {
            throw new Error(
                "El identificador del triaje no es válido."
            );
        }


        // 2. Buscar el registro de triaje
        const triaje = await this.triajeRepository.buscarPorId(
            datos.idTriaje
        );

        if (!triaje) {
            throw new Error(
                "No se encontró el registro de triaje solicitado."
            );
        }


        // 3. Ejecutar la acción correspondiente
        switch (datos.accion) {

            case "INICIAR_ATENCION":

                triaje.iniciarAtencion();
                break;


            case "FINALIZAR_ATENCION":

                triaje.finalizarAtencion();
                break;


            default:
                throw new Error("La acción solicitada no es válida.");
        }


        // 4. Persistir los cambios
        await this.triajeRepository.actualizar(triaje);


        return triaje;

    }

}
