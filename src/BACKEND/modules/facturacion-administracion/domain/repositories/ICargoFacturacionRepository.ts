
import type { Cargo } from '../entities/Cargo.js';

export interface ICargoFacturacionRepository {

  guardar(cargo: Cargo): Promise<Cargo>;

  buscarPorAdministracion(
    idAdministracionMedicacion: number
  ): Promise<Cargo | null>;

}
