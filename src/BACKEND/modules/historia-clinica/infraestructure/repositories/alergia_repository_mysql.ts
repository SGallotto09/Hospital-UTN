import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { Database } from '../../../../database/connectionDB.js';

import type {
    AlergiaRepository,
    DatosNuevaAlergia,
    VersionAlergia,
} from '../../domain/repositories/alergia_repository.js';

import type { Alergia } from '../../domain/entities/alergia.js';

export class AlergiaRepositoryMySQL implements AlergiaRepository {
    private readonly db = Database.getInstance();

    async guardar(datos: DatosNuevaAlergia): Promise<Alergia> {
        return this.db.withTransaction((conexion) => this.insertar(conexion, datos));
    }

    async rectificar(idAnterior: number, datos: DatosNuevaAlergia, motivo: string) {
        return this.db.withTransaction(async (conexion) => {
            const [anteriores] = await conexion.execute<RowDataPacket[]>(
                'SELECT id FROM alergias WHERE id = ? AND id_paciente = ? FOR UPDATE',
                [idAnterior, datos.id_paciente],
            );
            if (!anteriores.length) return 'inexistente' as const;

            const [sucesoras] = await conexion.execute<RowDataPacket[]>(
                'SELECT id_alergia_nueva FROM alergia_rectificaciones WHERE id_alergia_anterior = ?',
                [idAnterior],
            );
            if (sucesoras.length) return 'reemplazada' as const;

            const nueva = await this.insertar(conexion, datos);
            await conexion.execute(
                'INSERT INTO alergia_rectificaciones (id_alergia_anterior, id_alergia_nueva, motivo) VALUES (?, ?, ?)',
                [idAnterior, nueva.id, motivo],
            );
            return nueva;
        });
    }

    private async insertar(conexion: PoolConnection, datos: DatosNuevaAlergia): Promise<Alergia> {
        const [resultado] = await conexion.execute(
            `INSERT INTO alergias
             (id_paciente, sustancia, reaccion, gravedad, fecha_deteccion, estado, id_medico)
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
    }

    async obtenerPorPaciente(idPaciente: number): Promise<Alergia[]> {
        const [filas] = await this.db.query(
            `SELECT r.*, CONCAT(u.nombre, ' ', u.apellido) AS autor FROM alergias r JOIN usuarios u ON u.id = r.id_medico WHERE r.id_paciente = ? ORDER BY r.fecha_registro DESC, r.id DESC`,
            [idPaciente],
        );

        return filas as Alergia[];
    }

    async obtenerVersionesPorPaciente(idPaciente: number): Promise<VersionAlergia[]> {
        const [filas] = await this.db.query(
            `SELECT r.*, CONCAT(u.nombre, ' ', u.apellido) AS autor,
                    DATE_FORMAT(r.fecha_deteccion, '%Y-%m-%d') AS fecha_deteccion_calendario,
                    origen.id_alergia_anterior, sucesora.id_alergia_nueva, origen.motivo
             FROM alergias r
             JOIN usuarios u ON u.id = r.id_medico
             LEFT JOIN alergia_rectificaciones origen ON origen.id_alergia_nueva = r.id
             LEFT JOIN alergia_rectificaciones sucesora ON sucesora.id_alergia_anterior = r.id
             WHERE r.id_paciente = ?
             ORDER BY r.fecha_registro DESC, r.id DESC`,
            [idPaciente],
        );
        return filas as VersionAlergia[];
    }
}
