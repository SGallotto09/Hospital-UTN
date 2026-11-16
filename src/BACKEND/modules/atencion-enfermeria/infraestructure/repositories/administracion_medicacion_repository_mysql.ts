import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { Database } from '../../../../database/connectionDB.js';

import type { AdministracionMedicacionRepository } from '../../domain/repositories/administracion_medicacion_repository.js';
import type { IndicacionMedicacion } from '../../domain/entities/indicacion_medicacion.js';

export class AdministracionMedicacionRepositoryMysq implements AdministracionMedicacionRepository {

    private readonly db = Database.getInstance();



async obtenerTodas(): Promise<IndicacionMedicacion[]> {
        const sql = `
            SELECT
                im.id AS id_indicacion_medica,
                p.id AS id_paciente,
                p.nombre,
                p.apellido,
                c.habitacion,
                i.nombre AS medicamento,
                im.cantidad,
                DATE_FORMAT(im.fecha, '%Y-%m-%d') AS fecha,
                TIME_FORMAT(im.hora_incio, '%H:%i:%s') AS hora_inicio,
                im.frecuencia_hora AS frecuencia_horas
            FROM indicacion_medica im
            INNER JOIN pacientes p
                ON p.id = im.id_paciente
            INNER JOIN insumos i
                ON i.id = im.id_insumo
            INNER JOIN asignaciones_camas ac
                ON ac.id_paciente = p.id
            INNER JOIN camas c
                ON c.id = ac.id_cama
            WHERE ac.fecha_egreso IS NULL
        `;

        const [filas] = await this.db.query(sql);

        return filas as IndicacionMedicacion[];
    }


    async administrar(
        id_indicacion_medica: number,
        id_enfermero: number,
        fecha_hora: Date,
        horario_programado: Date
    ): Promise<void> {
        await this.db.withTransaction(async conexion => {
            // Serializa las administraciones de una indicación antes de comprobar la dosis.
            const [indicaciones] = await conexion.execute<(RowDataPacket & {
                id_insumo: number; cantidad: number; id_paciente: number;
                fecha: string; hora_inicio: string; frecuencia_horas: number;
            })[]>(`
                SELECT id_insumo, cantidad, id_paciente,
                    DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha,
                    TIME_FORMAT(hora_incio, '%H:%i:%s') AS hora_inicio,
                    frecuencia_hora AS frecuencia_horas
                FROM indicacion_medica WHERE id = ? FOR UPDATE
            `, [id_indicacion_medica]);
            const indicacion = indicaciones[0];
            if (!indicacion) throw new Error('No se encontró la indicación médica');
            if (!Number.isSafeInteger(indicacion.cantidad) || indicacion.cantidad <= 0) {
                throw new Error('La cantidad debe representar unidades positivas de inventario');
            }

            // Revalida el horario con los datos bloqueados, por si cambió la indicación.
            const inicio = new Date(`${indicacion.fecha}T${indicacion.hora_inicio}`);
            const intervalo = indicacion.frecuencia_horas * 60 * 60 * 1000;
            const diferencia = horario_programado.getTime() - inicio.getTime();
            const numeroDosis = Math.round(diferencia / intervalo);
            if (Number.isNaN(inicio.getTime()) || !Number.isInteger(indicacion.frecuencia_horas) ||
                indicacion.frecuencia_horas <= 0 || !Number.isFinite(diferencia) ||
                numeroDosis < 0 || Math.abs(diferencia - numeroDosis * intervalo) > 1000) {
                throw new Error('El horario seleccionado no corresponde a una dosis programada');
            }
            if (Math.abs(Date.now() - horario_programado.getTime()) > 30 * 60 * 1000) {
                throw new Error('La medicación está fuera del horario permitido de ±30 minutos');
            }

            const [administradas] = await conexion.execute<RowDataPacket[]>(`
                SELECT id FROM administracion_medicacion
                WHERE id_indicacion_medica = ? AND estado = 'Administrada'
                AND fecha_hora BETWEEN DATE_SUB(?, INTERVAL 30 MINUTE)
                    AND DATE_ADD(?, INTERVAL 30 MINUTE)
                FOR UPDATE
            `, [id_indicacion_medica, horario_programado, horario_programado]);
            if (administradas.length) throw new Error('Esta dosis ya fue administrada');

            const [asignaciones] = await conexion.execute<(RowDataPacket & { piso: number })[]>(`
                SELECT c.piso FROM asignaciones_camas ac
                INNER JOIN camas c ON c.id = ac.id_cama
                WHERE ac.id_paciente = ? AND ac.fecha_egreso IS NULL
                FOR UPDATE
            `, [indicacion.id_paciente]);
            if (asignaciones.length !== 1 || !Number.isSafeInteger(asignaciones[0]?.piso)) {
                throw new Error('El paciente debe tener una única cama activa con piso válido');
            }

            const [resultado] = await conexion.execute<ResultSetHeader>(`
                INSERT INTO administracion_medicacion
                    (id_indicacion_medica, estado, id_enfermero, fecha_hora)
                VALUES (?, ?, ?, ?)
            `, [id_indicacion_medica, 'Administrada', id_enfermero, fecha_hora]);
            await conexion.execute(`
                INSERT INTO consumos_medicacion
                    (id_administracion, id_insumo, cantidad, piso, estado)
                VALUES (?, ?, ?, ?, 'pendiente')
            `, [resultado.insertId, indicacion.id_insumo, indicacion.cantidad, asignaciones[0]!.piso]);
        });
    }

    async obtenerDatosIndicacion(id_indicacion_medica: number): Promise<{fecha: string; hora_inicio: string; frecuencia_horas: number;} | null> {
        const sql = `
            SELECT
                DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha,
                TIME_FORMAT(hora_incio, '%H:%i:%s') AS hora_inicio,
                frecuencia_hora AS frecuencia_horas
            FROM indicacion_medica
            WHERE id = ?
        `;

        const [filas] = await this.db.query(sql, [id_indicacion_medica]);

        const indicaciones = filas as {
            fecha: string;
            hora_inicio: string;
            frecuencia_horas: number;
        }[];

        if (indicaciones.length === 0) {
            return null;
        }

        return indicaciones[0] ?? null;
    }


    async existeDosisAdministrada(idIndicacionMedica: number, horarioProgramado: Date): Promise<boolean> {

        const sql = `
            SELECT id
            FROM administracion_medicacion
            WHERE id_indicacion_medica = ?
            AND estado = 'Administrada'
            AND fecha_hora BETWEEN
                DATE_SUB(?, INTERVAL 30 MINUTE)
                AND DATE_ADD(?, INTERVAL 30 MINUTE)
        `;

        const [filas] = await this.db.query(sql, [
            idIndicacionMedica,
            horarioProgramado,
            horarioProgramado
        ]);

        const administraciones = filas as { id: number }[];

        return administraciones.length > 0;
    }
}
