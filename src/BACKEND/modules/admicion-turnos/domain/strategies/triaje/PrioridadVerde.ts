import type { IEstrategiaPrioridadTriaje } from "./IEstrategiaPrioridadTriaje.js";

export class PrioridadVerde implements IEstrategiaPrioridadTriaje {
    obtenerPrioridad(): number {
        return 3;
    }
}
