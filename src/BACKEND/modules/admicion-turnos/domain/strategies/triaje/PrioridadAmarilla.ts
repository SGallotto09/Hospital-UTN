import type {IEstrategiaPrioridadTriaje} from "./IEstrategiaPrioridadTriaje.js";

export class PrioridadAmarilla implements IEstrategiaPrioridadTriaje {
    obtenerPrioridad(): number {
        return 2;
    }
}
