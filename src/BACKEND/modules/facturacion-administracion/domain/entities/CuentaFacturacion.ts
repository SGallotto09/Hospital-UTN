
import { Cargo } from './Cargo.js';

export class CuentaFacturacion {

  private cargos: Cargo[] = [];

  constructor(
    public id: number,
    public idPaciente: number
  ) {}

 

agregarCargo(cargo: Cargo): void {

  if (cargo.idCuenta !== this.id) {
    throw new Error('El cargo no pertenece a esta cuenta');
  }

  for (const existente of this.cargos) {
    if (
      cargo.idAdministracionMedicacion !== null &&
      existente.idAdministracionMedicacion === cargo.idAdministracionMedicacion
    ) {
      throw new Error('Esta administración de medicación ya fue cobrada');
    }
  }

  this.cargos.push(cargo);
}


  calcularTotal(): number {
    let total = 0;

    for (const cargo of this.cargos) {
      total += cargo.importe;
    }

    return total;
  }

}
