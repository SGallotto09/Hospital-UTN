
import { Database } from '../../../../database/connectionDB.js';
import type { ProtocoloAtencionRepository } from '../../domain/repositories/protocolo_atencion_repository.js';
import type { ProtocoloAtencion } from '../../domain/entities/protocolo_atencion.js';
import type { TareaEnfermeria } from '../../domain/entities/tarea_enfermeria.js';
import type { ResultSetHeader } from 'mysql2/promise';

export class ProtocoloAtencionRepositoryMysql implements ProtocoloAtencionRepository {
    private readonly db = Database.getInstance();


    async guardar(protocolo: ProtocoloAtencion): Promise<number> {
        const [resultado] = await this.db.query(
            `INSERT INTO protocolos_atencion
                (id_paciente, tipo_protocolo, fecha_generacion)
            VALUES (?, ?, ?)`,
            [
                protocolo.id_paciente,
                protocolo.tipo_protocolo,
                protocolo.fecha_generacion
            ]
        );

        const id_protocolo = (resultado as ResultSetHeader).insertId;

        try {
            for (const tarea of protocolo.tareas) {
                await this.db.query(
                    `INSERT INTO tareas_enfermeria
                        (id_protocolo, descripcion, estado)
                    VALUES (?, ?, ?)`,
                    [id_protocolo, tarea.descripcion, tarea.estado]
                );
            }

            return id_protocolo;

        } catch (error) {
            try {
                await this.db.query(
                    `DELETE FROM protocolos_atencion WHERE id = ?`,
                    [id_protocolo]
                );
            } catch (error_limpieza) {
                console.error(
                    'No se pudo eliminar el protocolo incompleto:',
                    error_limpieza
                );
            }

            throw error;
        }
    }


    async obtenerPorPaciente(id_paciente: number): Promise<ProtocoloAtencion[]> {
        const [filasProtocolos] = await this.db.query(
            `SELECT id, id_paciente, tipo_protocolo, fecha_generacion
             FROM protocolos_atencion
             WHERE id_paciente = ?
             ORDER BY fecha_generacion DESC`,
            [id_paciente]
        );

        const protocolos = filasProtocolos as Omit<ProtocoloAtencion, 'tareas'>[];
        const resultado: ProtocoloAtencion[] = [];

        for (const protocolo of protocolos) {
            const [filasTareas] = await this.db.query(
                `SELECT id, descripcion, estado
                 FROM tareas_enfermeria
                 WHERE id_protocolo = ?
                 ORDER BY id`,
                [protocolo.id]
            );

            resultado.push({
                id: protocolo.id,
                id_paciente: protocolo.id_paciente,
                tipo_protocolo: protocolo.tipo_protocolo,
                fecha_generacion: protocolo.fecha_generacion,
                tareas: filasTareas as TareaEnfermeria[]
            });
        }

        return resultado;
    }


    async actualizarEstadoTarea(
        id_tarea: number,
        estado: 'Pendiente' | 'Completada'
    ): Promise<void> {
        const [resultado] = await this.db.query(
            `UPDATE tareas_enfermeria
            SET estado = ?
            WHERE id = ?`,
            [estado, id_tarea]
        );

        if ((resultado as ResultSetHeader).affectedRows === 0) {
            throw new Error('No se encontró la tarea indicada.');
        }
    }

}
