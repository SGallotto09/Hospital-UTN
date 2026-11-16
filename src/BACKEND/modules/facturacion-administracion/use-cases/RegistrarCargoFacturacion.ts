
import type { Cargo } from '../domain/entities/Cargo.js';

import type { ICargoFacturacionRepository } from '../domain/repositories/ICargoFacturacionRepository.js';

export class RegistrarCargoFacturacion {

  constructor(
    private repositorio: ICargoFacturacionRepository
  ) {}

  async ejecutar(cargo: Cargo): Promise<Cargo> {

    if (cargo.idCuenta <= 0) {
      throw new Error('La cuenta de facturación no es válida');
    }

    if (cargo.idAdministracionMedicacion !== null) {

      const existente =
        await this.repositorio.buscarPorAdministracion(
          cargo.idAdministracionMedicacion
        );

      if (existente !== null) {
        throw new Error(
          'Esta administración de medicación ya fue cobrada'
        );
      }
    }

    return this.repositorio.guardar(cargo);
  }

}
