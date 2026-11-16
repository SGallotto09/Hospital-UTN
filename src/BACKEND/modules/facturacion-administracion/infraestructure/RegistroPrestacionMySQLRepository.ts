
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import { Database } from '../../../database/connectionDB.js';

import type {
  IRegistroPrestacionRepository,
  DatosRegistroPrestacion,
  ResultadoRegistroPrestacion
} from '../domain/repositories/IRegistroPrestacionRepository.js';

export class RegistroPrestacionMySQLRepository
  implements IRegistroPrestacionRepository {

  async registrar(
    datos: DatosRegistroPrestacion
  ): Promise<ResultadoRegistroPrestacion> {

    return Database.getInstance().withTransaction(
      async (conexion) => {

        // Verificar que la cuenta exista y esté activa.
        const [cuentas] = await conexion.execute<RowDataPacket[]>(
          `SELECT id
           FROM cuentas_facturacion
           WHERE id = ? AND estado = 'activa'
           FOR UPDATE`,
          [datos.idCuenta]
        );

        if (cuentas.length === 0) {
          throw new Error(
            'La cuenta de facturación no existe o no está activa'
          );
        }

        // Registrar el importe que corresponde al paciente.
        const [cargo] = await conexion.execute<ResultSetHeader>(
          `INSERT INTO cargos_facturacion
            (
              id_cuenta,
              id_administracion_medicacion,
              concepto,
              importe,
              fecha
            )
           VALUES (?, NULL, ?, ?, NOW())`,
          [
            datos.idCuenta,
            datos.concepto,
            datos.montoPaciente
          ]
        );

        const idCargo = cargo.insertId;
        let idReclamo: number | null = null;

        // Registrar la parte que corresponde a terceros.
        if (datos.montoCobertura > 0) {

          if (!datos.entidadDestino) {
            throw new Error(
              'Falta identificar la entidad responsable del pago'
            );
          }

          const [reclamo] =
            await conexion.execute<ResultSetHeader>(
              `INSERT INTO reclamos_cobertura
                (
                  id_cargo,
                  tipo_cobertura,
                  entidad_destino,
                  importe,
                  estado,
                  fecha_creacion
                )
               VALUES (?, ?, ?, ?, 'pendiente', NOW())`,
              [
                idCargo,
                datos.tipoCobertura,
                datos.entidadDestino,
                datos.montoCobertura
              ]
            );

          idReclamo = reclamo.insertId;
        }

        return {
          idCargo,
          idReclamo
        };
      }
    );
  }
}
