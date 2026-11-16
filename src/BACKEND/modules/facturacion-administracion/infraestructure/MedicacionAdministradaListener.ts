
import {
  event_bus,
  type MedicacionAdministradaEvent
} from '../../../events/event_bus.js';

import { ProcesarMedicacionAdministrada } from '../use-cases/ProcesarMedicacionAdministrada.js';

export function registrarListenerMedicacionAdministrada(
  procesarMedicacion: ProcesarMedicacionAdministrada
): void {

  event_bus.on(
    'MedicacionAdministrada',
    (evento: MedicacionAdministradaEvent) => {

      void procesarMedicacion.ejecutar({
        idAdministracionMedicacion:
          evento.idAdministracionMedicacion,

        cantidadAdministrada:
          evento.cantidadAdministrada
      }).catch((error: unknown) => {

        console.error(
          'Error al facturar medicación administrada:',
          error
        );

      });

    }
  );

}
