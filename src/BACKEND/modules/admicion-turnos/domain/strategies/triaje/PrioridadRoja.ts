import type { IEstrategiaPrioridadTriaje} from "./IEstrategiaPrioridadTriaje.js";

export class PrioridadRoja implements IEstrategiaPrioridadTriaje {
    obtenerPrioridad(): number {
        return 1;
    }
}
