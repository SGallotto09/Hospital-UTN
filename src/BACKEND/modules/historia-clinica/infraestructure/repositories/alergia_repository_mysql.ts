import { Database } from '../../../../database/connectionDB.js';

import type {
    AlergiaRepository,
    DatosNuevaAlergia,
} from '../../domain/repositories/alergia_repository.js';

import type { Alergia } from '../../domain/entities/alergia.js';

export class AlergiaRepositoryMySQL implements AlergiaRepository {
    private readonly db = Database.getInstance();

    async guardar(datos: DatosNuevaAlergia): Promise<Alergia> {
        return this.db.withTransaction(async (conexion) => {
            const [resultado] = await conexion.execute(
                `INSERT INTO alergias
            (id_paciente, sustancia, reaccion, gravedad,
             fecha_deteccion, estado, id_medico)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    datos.id_paciente,
                    datos.sustancia,
                    datos.reaccion,
                    datos.gravedad,
                    datos.fecha_deteccion,
                    datos.estado,
                    datos.id_medico,
                ],
            );

            const id = (resultado as { insertId: number }).insertId;

            const [filas] = await conexion.execute(
                `SELECT r.*, CONCAT(u.nombre, ' ', u.apellido) AS autor FROM alergias r JOIN usuarios u ON u.id = r.id_medico WHERE r.id = ?`,
                [id],
            );

            const alergias = filas as Alergia[];

            if (alergias.length === 0) {
                throw new Error('No se pudo recuperar la alergia registrada');
            }

            return alergias[0]!;
        });
    }

    async obtenerPorPaciente(idPaciente: number): Promise<Alergia[]> {
        const [filas] = await this.db.query(
            `SELECT r.*, CONCAT(u.nombre, ' ', u.apellido) AS autor FROM alergias r JOIN usuarios u ON u.id = r.id_medico WHERE r.id_paciente = ? ORDER BY r.fecha_registro DESC, r.id DESC`,
            [idPaciente],
        );

        return filas as Alergia[];
    }
}
