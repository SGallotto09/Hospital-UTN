
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

import { Database } from '../../../database/connectionDB.js';

import { Cargo } from '../domain/entities/Cargo.js';

import type { ICargoFacturacionRepository } from '../domain/repositories/ICargoFacturacionRepository.js';

export class CargoFacturacionMySQLRepository
  implements ICargoFacturacionRepository {

  async guardar(cargo: Cargo): Promise<Cargo> {

    const db = Database.getInstance();

    const [resultado] = await db.query(
      `INSERT INTO cargos_facturacion
       (id_cuenta, id_administracion_medicacion, concepto, importe, fecha)
       VALUES (?, ?, ?, ?, NOW())`,
      [
        cargo.idCuenta,
        cargo.idAdministracionMedicacion,
        cargo.concepto,
        cargo.importe
      ]
    );

    const respuesta = resultado as ResultSetHeader;

    return new Cargo(
      respuesta.insertId,
      cargo.idCuenta,
      cargo.concepto,
      cargo.importe,
      cargo.idAdministracionMedicacion
    );
  }

  async buscarPorAdministracion(
    idAdministracionMedicacion: number
  ): Promise<Cargo | null> {

    const db = Database.getInstance();

    const [resultado] = await db.query(
      `SELECT *
       FROM cargos_facturacion
       WHERE id_administracion_medicacion = ?`,
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

    return new Cargo(
      Number(fila.id),
      Number(fila.id_cuenta),
      String(fila.concepto),
      Number(fila.importe),
      Number(fila.id_administracion_medicacion)
    );
  }

}
