
import { describe, it, expect, vi } from 'vitest';

import { event_bus } from '../../../../events/event_bus.js';

import { registrarListenerMedicacionAdministrada } from '../../infraestructure/MedicacionAdministradaListener.js';

import type { ProcesarMedicacionAdministrada } from '../../use-cases/ProcesarMedicacionAdministrada.js';

describe('MedicacionAdministradaListener', () => {

  it('recibe el evento de Enfermería y llama a Facturación', () => {

    const ejecutar = vi.fn().mockResolvedValue(undefined);

    const procesar = {
      ejecutar
    } as unknown as ProcesarMedicacionAdministrada;

    const listenersAnteriores =
      event_bus.listeners('MedicacionAdministrada');

    try {
      registrarListenerMedicacionAdministrada(procesar);

      event_bus.emitir_medicacion_administrada({
        idAdministracionMedicacion: 15,
        cantidadAdministrada: 1
      });

      expect(ejecutar).toHaveBeenCalledExactlyOnceWith({
        idAdministracionMedicacion: 15,
        cantidadAdministrada: 1
      });

    } finally {
      for (const listener of event_bus.listeners('MedicacionAdministrada')) {
        if (!listenersAnteriores.includes(listener)) {
          
event_bus.off(
  'MedicacionAdministrada',
  listener as (...args: unknown[]) => void
);

        }
      }
    }
  });

});
