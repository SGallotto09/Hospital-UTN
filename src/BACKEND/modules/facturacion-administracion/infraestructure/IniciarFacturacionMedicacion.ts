
import { AdministracionMedicacionMySQLRepository } from './AdministracionMedicacionMySQLRepository.js';
import { CuentaFacturacionMySQLRepository } from './CuentaFacturacionMySQLRepository.js';
import { PrecioInsumoMySQLRepository } from './PrecioInsumoMySQLRepository.js';
import { CargoFacturacionMySQLRepository } from './CargoFacturacionMySQLRepository.js';

import { CalcularCostoMedicacion } from '../use-cases/CalcularCostoMedicacion.js';
import { RegistrarCargoFacturacion } from '../use-cases/RegistrarCargoFacturacion.js';
import { ProcesarMedicacionAdministrada } from '../use-cases/ProcesarMedicacionAdministrada.js';

import { registrarListenerMedicacionAdministrada } from './MedicacionAdministradaListener.js';

export function iniciarFacturacionMedicacion(): void {

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

  registrarListenerMedicacionAdministrada(
    procesarMedicacion
  );
}
