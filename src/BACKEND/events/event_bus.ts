
import { EventEmitter } from 'node:events';

export interface MedicacionAdministradaEvent {
    idAdministracionMedicacion: number;
    cantidadAdministrada: number;
}

class EventBus extends EventEmitter {
    emitir_medicacion_administrada(
        datos: MedicacionAdministradaEvent
    ): void {
        this.emit('MedicacionAdministrada', datos);
    }
}

export const event_bus = new EventBus();
