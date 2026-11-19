
import { AdministracionMedicacionMySQLRepository } from './AdministracionMedicacionMySQLRepository.js';
import { CuentaFacturacionMySQLRepository } from './CuentaFacturacionMySQLRepository.js';
import { PrecioInsumoMySQLRepository } from './PrecioInsumoMySQLRepository.js';
import { CargoFacturacionMySQLRepository } from './CargoFacturacionMySQLRepository.js';

import { CalcularCostoMedicacion } from '../use-cases/CalcularCostoMedicacion.js';
import { RegistrarCargoFacturacion } from '../use-cases/RegistrarCargoFacturacion.js';
import { ProcesarMedicacionAdministrada } from '../use-cases/ProcesarMedicacionAdministrada.js';

import { Database } from '../../../database/connectionDB.js';

// Devuelve una tarea para el procesador compartido; no crea otro temporizador ni listener.
export function iniciarFacturacionMedicacion(): () => Promise<void> {

  const administraciones =
    new AdministracionMedicacionMySQLRepository();

  const cuentas =
    new CuentaFacturacionMySQLRepository();

  const precios =
    new PrecioInsumoMySQLRepository();

  const cargos =
    new CargoFacturacionMySQLRepository();

  const calcularCosto =
    new CalcularCostoMedicacion(precios);

  const registrarCargo =
    new RegistrarCargoFacturacion(cargos);

  const procesarMedicacion =
    new ProcesarMedicacionAdministrada(
      administraciones,
      cuentas,
      calcularCosto,
      registrarCargo
    );

  let ultimoId = 0;
  return async () => {
    const [resultado] = await Database.getInstance().query(
      `SELECT c.id_administracion, c.cantidad
       FROM consumos_medicacion c
       LEFT JOIN cargos_facturacion cargo
         ON cargo.id_administracion_medicacion = c.id_administracion
       WHERE cargo.id IS NULL AND c.id_administracion > ?
       ORDER BY c.id_administracion LIMIT 10`,
      [ultimoId]
    );
    const pendientes = resultado as { id_administracion: number; cantidad: number }[];
    if (pendientes.length === 0) {
      ultimoId = 0;
      return;
    }
    for (const pendiente of pendientes) {
      ultimoId = pendiente.id_administracion;
      try {
        await procesarMedicacion.ejecutar({
          idAdministracionMedicacion: pendiente.id_administracion,
          cantidadAdministrada: pendiente.cantidad
        });
      } catch (error) {
        // La administración no se pierde. Se vuelve a recorrer al terminar la vuelta.
        console.error(`No se pudo facturar la administración ${pendiente.id_administracion}.`, error);
      }
    }
  };
}
