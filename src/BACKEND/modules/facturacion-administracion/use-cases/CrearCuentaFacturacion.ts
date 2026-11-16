
import type { ICuentaFacturacionRepository } from '../domain/repositories/ICuentaFacturacionRepository.js';

import type { CuentaFacturacion } from '../domain/entities/CuentaFacturacion.js';

export class CrearCuentaFacturacion {

  constructor(
    private repositorio: ICuentaFacturacionRepository
  ) {}

  async ejecutar(idPaciente: number): Promise<CuentaFacturacion> {

    if (idPaciente <= 0) {
      throw new Error('El ID del paciente no es válido');
    }

    const cuentaExistente =
      await this.repositorio.buscarActivaPorPaciente(idPaciente);

    if (cuentaExistente !== null) {
      throw new Error('El paciente ya tiene una cuenta activa');
    }

    return this.repositorio.crear(idPaciente);
  }

}
