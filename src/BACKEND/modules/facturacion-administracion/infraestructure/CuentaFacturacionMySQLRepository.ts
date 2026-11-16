
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

import { Database } from '../../../database/connectionDB.js';

import { CuentaFacturacion } from '../domain/entities/CuentaFacturacion.js';

import type { ICuentaFacturacionRepository } from '../domain/repositories/ICuentaFacturacionRepository.js';

export class CuentaFacturacionMySQLRepository
  implements ICuentaFacturacionRepository {

  async buscarActivaPorPaciente(
    idPaciente: number
  ): Promise<CuentaFacturacion | null> {

    const db = Database.getInstance();

    const [resultado] = await db.query(
      `SELECT id, id_paciente
       FROM cuentas_facturacion
       WHERE id_paciente = ? AND estado = ?
       LIMIT 1`,
      [idPaciente, 'activa']
    );

    const filas = resultado as RowDataPacket[];

    if (filas.length === 0) {
      return null;
    }

    const fila = filas[0];

    if (!fila) {
      return null;
    }

    return new CuentaFacturacion(
      Number(fila.id),
      Number(fila.id_paciente)
    );
  }

  async crear(
    idPaciente: number
  ): Promise<CuentaFacturacion> {

    const db = Database.getInstance();

    const [resultado] = await db.query(
      `INSERT INTO cuentas_facturacion
       (id_paciente, fecha_apertura, estado)
       VALUES (?, NOW(), ?)`,
      [idPaciente, 'activa']
    );

    const respuesta = resultado as ResultSetHeader;

    return new CuentaFacturacion(
      respuesta.insertId,
      idPaciente
    );
  }

}
