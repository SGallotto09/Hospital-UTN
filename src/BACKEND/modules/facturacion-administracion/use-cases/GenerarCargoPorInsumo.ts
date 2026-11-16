
import { Cargo } from '../domain/entities/Cargo.js';
import { CuentaFacturacion } from '../domain/entities/CuentaFacturacion.js';

export class GenerarCargoPorInsumo {

  ejecutar(
    cuenta: CuentaFacturacion,
    idCargo: number,
    nombreInsumo: string,
    importe: number,
    idAdministracionMedicacion: number
  ): void {

    const cargo = new Cargo(
      idCargo,
      cuenta.id,
      nombreInsumo,
      importe,
      idAdministracionMedicacion
    );

    cuenta.agregarCargo(cargo);
  }

}
