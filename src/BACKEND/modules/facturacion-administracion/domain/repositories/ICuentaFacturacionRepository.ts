
import type { CuentaFacturacion } from '../entities/CuentaFacturacion.js';

export interface ICuentaFacturacionRepository {

  buscarActivaPorPaciente(
    idPaciente: number
  ): Promise<CuentaFacturacion | null>;

  crear(
    idPaciente: number
  ): Promise<CuentaFacturacion>;

}
