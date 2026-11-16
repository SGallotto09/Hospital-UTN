
import type { RowDataPacket } from 'mysql2';

import { Database } from '../../../database/connectionDB.js';

import type {
  IAdministracionMedicacionRepository,
  DatosAdministracionMedicacion
} from '../domain/repositories/IAdministracionMedicacionRepository.js';

export class AdministracionMedicacionMySQLRepository
  implements IAdministracionMedicacionRepository {

  async obtenerDatos(
    idAdministracionMedicacion: number
  ): Promise<DatosAdministracionMedicacion | null> {

    const db = Database.getInstance();

    const [resultado] = await db.query(
      `SELECT
        im.id_paciente AS idPaciente,
        im.id_insumo AS idInsumo,
        im.cantidad AS cantidadTotalTratamiento,
        am.estado AS estado
      FROM administracion_medicacion am
      INNER JOIN indicacion_medica im
        ON am.id_indicacion_medica = im.id
      WHERE am.id = ?`,
      [idAdministracionMedicacion]
    );

    const filas = resultado as RowDataPacket[];

    if (filas.length === 0) {
      return null;
    }

    const fila = filas[0];

    if (!fila) {
      return null;
    }

    return {
      idPaciente: Number(fila.idPaciente),
      idInsumo: Number(fila.idInsumo),
      cantidadTotalTratamiento: Number(fila.cantidadTotalTratamiento),
      estado: String(fila.estado)
    };
  }

}
