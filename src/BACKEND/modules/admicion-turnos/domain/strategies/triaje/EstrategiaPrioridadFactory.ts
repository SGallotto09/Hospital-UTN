import type { NivelUrgencia } from "../../entities/Triaje.js";

import type { IEstrategiaPrioridadTriaje} from "./IEstrategiaPrioridadTriaje.js";

import { PrioridadRoja } from "./PrioridadRoja.js";
import { PrioridadAmarilla } from "./PrioridadAmarilla.js";
import { PrioridadVerde } from "./PrioridadVerde.js";


const estrategias: Record<
    NivelUrgencia,
    IEstrategiaPrioridadTriaje
> = {
    ROJO: new PrioridadRoja(),
    AMARILLO: new PrioridadAmarilla(),
    VERDE: new PrioridadVerde()
};


export function obtenerEstrategiaPrioridad(
    nivel: NivelUrgencia
): IEstrategiaPrioridadTriaje {

    const estrategia = estrategias[nivel];

    if (!estrategia) {
        throw new Error(
            `No existe una estrategia para el nivel ${nivel}.`
        );
    }

    return estrategia;
}
