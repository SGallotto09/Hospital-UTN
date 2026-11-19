import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { Database } from '../../../../database/connectionDB.js';

import type { AdministracionMedicacionRepository } from '../../domain/repositories/administracion_medicacion_repository.js';
import type { IndicacionMedicacion } from '../../domain/entities/indicacion_medicacion.js';
import { ErrorEnfermeria } from '../../domain/errors/error_enfermeria.js';

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

        await this.detectarAdministracionesSinConsumo();

        return filas as IndicacionMedicacion[];
    }

    async obtenerOpcionesIndicacion(): Promise<{
        pacientes: { id: number; nombre: string; apellido: string }[];
        insumos: { id: number; nombre: string }[];
    }> {
        const [filasPacientes] = await this.db.query(`
            SELECT p.id, p.nombre, p.apellido
            FROM pacientes p
            INNER JOIN asignaciones_camas ac ON ac.id_paciente = p.id
            WHERE ac.fecha_egreso IS NULL
            GROUP BY p.id, p.nombre, p.apellido
            HAVING COUNT(DISTINCT ac.id) = 1
            ORDER BY p.apellido, p.nombre
        `);
        const [filasInsumos] = await this.db.query(`
            SELECT id, nombre
            FROM insumos
            ORDER BY nombre
        `);
        return {
            pacientes: filasPacientes as { id: number; nombre: string; apellido: string }[],
            insumos: filasInsumos as { id: number; nombre: string }[],
        };
    }

    async crearIndicacion(datos: {
        id_medico: number;
        id_paciente: number;
        id_insumo: number;
        cantidad: number;
        fecha: string;
        hora_inicio: string;
        frecuencia_horas: number;
    }): Promise<number> {
        const [filasPaciente] = await this.db.query(`
            SELECT ac.id
            FROM asignaciones_camas ac
            WHERE ac.id_paciente = ? AND ac.fecha_egreso IS NULL
            LIMIT 2
        `, [datos.id_paciente]);
        const asignaciones = filasPaciente as { id: number }[];
        if (asignaciones.length === 0) {
            throw new ErrorEnfermeria('El paciente no tiene una internación activa.', 404);
        }
        if (asignaciones.length !== 1) {
            throw new ErrorEnfermeria('El paciente debe tener una única internación activa.', 409);
        }

        const [filasInsumo] = await this.db.query(
            'SELECT id FROM insumos WHERE id = ? LIMIT 1',
            [datos.id_insumo]
        );
        if ((filasInsumo as { id: number }[]).length === 0) {
            throw new ErrorEnfermeria('No se encontró el insumo seleccionado.', 404);
        }

        const [resultado] = await this.db.query(`
            INSERT INTO indicacion_medica
                (id_medico, id_paciente, id_insumo, cantidad, fecha, hora_incio, frecuencia_hora)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            datos.id_medico,
            datos.id_paciente,
            datos.id_insumo,
            datos.cantidad,
            datos.fecha,
            datos.hora_inicio,
            datos.frecuencia_horas,
        ]);
        const id = (resultado as ResultSetHeader).insertId;
        if (!Number.isSafeInteger(id) || id <= 0) {
            throw new Error('MySQL no devolvió un ID válido para la indicación.');
        }
        return id;
    }

    async obtenerHistorial(): Promise<{
        id: number;
        nombre: string;
        apellido: string;
        medicamento: string;
        cantidad: number;
        fecha_hora: Date;
        enfermero: string;
    }[]> {
        const [filas] = await this.db.query(`
            SELECT am.id, p.nombre, p.apellido, i.nombre AS medicamento,
                   im.cantidad, am.fecha_hora,
                   COALESCE(CONCAT(u.nombre, ' ', u.apellido), 'Usuario no disponible') AS enfermero
            FROM administracion_medicacion am
            INNER JOIN indicacion_medica im ON im.id = am.id_indicacion_medica
            INNER JOIN pacientes p ON p.id = im.id_paciente
            INNER JOIN insumos i ON i.id = im.id_insumo
            LEFT JOIN usuarios u ON u.id = am.id_enfermero
            WHERE am.estado = 'Administrada'
            ORDER BY am.fecha_hora DESC
        `);
        return filas as {
            id: number;
            nombre: string;
            apellido: string;
            medicamento: string;
            cantidad: number;
            fecha_hora: Date;
            enfermero: string;
        }[];
    }

    private async detectarAdministracionesSinConsumo(): Promise<void> {
        try {
            const [filas] = await this.db.query(`
                SELECT am.id
                FROM administracion_medicacion am
                LEFT JOIN consumos_medicacion cm
                    ON cm.id_administracion = am.id
                WHERE am.estado = 'Administrada'
                    AND cm.id_administracion IS NULL
                ORDER BY am.fecha_hora DESC
            `);
            const administraciones = filas as { id: number }[];

            if (administraciones.length > 0) {
                const ids = administraciones.map(({ id }) => id).join(', ');
                console.error(
                    `Se detectaron administraciones sin consumo pendiente o procesado: ${ids}. Requieren revisión; no se reconstruyeron automáticamente.`
                );
            }
        } catch (error) {

            console.error('No se pudieron detectar administraciones sin consumo.', error);
        }
    }


    async administrar(
        id_indicacion_medica: number,
        id_enfermero: number,
        fecha_hora: Date,
        horario_programado: Date,
        cantidad_administrada?: number
    ): Promise<number> {
        if (cantidad_administrada !== undefined &&
            (!Number.isSafeInteger(cantidad_administrada) || cantidad_administrada <= 0)) {
            throw new ErrorEnfermeria('La cantidad administrada debe ser un entero positivo', 400);
        }
        return this.db.withTransaction(async conexion => {
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
            if (!indicacion) throw new ErrorEnfermeria('No se encontró la indicación médica', 404);
            if (!Number.isSafeInteger(indicacion.cantidad) || indicacion.cantidad <= 0) {
                throw new ErrorEnfermeria('La cantidad debe representar unidades positivas de inventario', 400);
            }
            if (cantidad_administrada !== undefined && cantidad_administrada !== indicacion.cantidad) {
                throw new ErrorEnfermeria('La cantidad administrada debe coincidir con la cantidad indicada', 400);
            }

            // Revalida el horario con los datos bloqueados, por si cambió la indicación.
            const inicio = new Date(`${indicacion.fecha}T${indicacion.hora_inicio}`);
            const intervalo = indicacion.frecuencia_horas * 60 * 60 * 1000;
            const diferencia = horario_programado.getTime() - inicio.getTime();
            const numeroDosis = Math.round(diferencia / intervalo);
            if (Number.isNaN(inicio.getTime()) || !Number.isInteger(indicacion.frecuencia_horas) ||
                indicacion.frecuencia_horas <= 0 || !Number.isFinite(diferencia) ||
                numeroDosis < 0 || Math.abs(diferencia - numeroDosis * intervalo) > 1000) {
                throw new ErrorEnfermeria('El horario seleccionado no corresponde a una dosis programada', 400);
            }
            if (Math.abs(Date.now() - horario_programado.getTime()) > 30 * 60 * 1000) {
                throw new ErrorEnfermeria('La medicación está fuera del horario permitido de ±30 minutos', 400);
            }

            const [administradas] = await conexion.execute<RowDataPacket[]>(`
                SELECT id FROM administracion_medicacion
                WHERE id_indicacion_medica = ? AND estado = 'Administrada'
                AND fecha_hora BETWEEN DATE_SUB(?, INTERVAL 30 MINUTE)
                    AND DATE_ADD(?, INTERVAL 30 MINUTE)
                FOR UPDATE
            `, [id_indicacion_medica, horario_programado, horario_programado]);
            if (administradas.length) throw new ErrorEnfermeria('Esta dosis ya fue administrada', 409);

            const [asignaciones] = await conexion.execute<(RowDataPacket & { piso: number })[]>(`
                SELECT c.piso FROM asignaciones_camas ac
                INNER JOIN camas c ON c.id = ac.id_cama
                WHERE ac.id_paciente = ? AND ac.fecha_egreso IS NULL
                FOR UPDATE
            `, [indicacion.id_paciente]);
            if (asignaciones.length !== 1 || !Number.isSafeInteger(asignaciones[0]?.piso)) {
                throw new ErrorEnfermeria('El paciente debe tener una única cama activa con piso válido', 409);
            }

            // Conserva la validación clínica preliminar; el descuento definitivo es del consumidor.
            const [existencias] = await conexion.execute<(RowDataPacket & { stock: number })[]>(
                'SELECT stock FROM insumos WHERE id = ? AND piso = ?',
                [indicacion.id_insumo, asignaciones[0]!.piso]
            );
            const stock = existencias[0]?.stock;
            if (typeof stock !== 'number' || !Number.isSafeInteger(stock) || stock < indicacion.cantidad) {
                throw new ErrorEnfermeria('No hay stock suficiente para administrar la medicación', 409);
            }

            const [resultado] = await conexion.execute<ResultSetHeader>(`
                INSERT INTO administracion_medicacion
                    (id_indicacion_medica, estado, id_enfermero, fecha_hora)
                VALUES (?, ?, ?, ?)
            `, [id_indicacion_medica, 'Administrada', id_enfermero, fecha_hora]);
            if (!Number.isSafeInteger(resultado.insertId) || resultado.insertId <= 0) {
                throw new Error('MySQL no devolvió un ID válido para la administración');
            }
            await conexion.execute(`
                INSERT INTO consumos_medicacion
                    (id_administracion, id_insumo, cantidad, piso, estado)
                VALUES (?, ?, ?, ?, 'pendiente')
            `, [resultado.insertId, indicacion.id_insumo, indicacion.cantidad, asignaciones[0]!.piso]);
            return resultado.insertId;
        });
    }

    async obtenerDatosIndicacion(id_indicacion_medica: number): Promise<{fecha: string; hora_inicio: string; frecuencia_horas: number; cantidad: number;} | null> {
        const sql = `
            SELECT
                DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha,
                TIME_FORMAT(hora_incio, '%H:%i:%s') AS hora_inicio,
                frecuencia_hora AS frecuencia_horas,
                cantidad
            FROM indicacion_medica
            WHERE id = ?
        `;

        const [filas] = await this.db.query(sql, [id_indicacion_medica]);

        const indicaciones = filas as {
            fecha: string;
            hora_inicio: string;
            frecuencia_horas: number;
            cantidad: number;
        }[];

        if (indicaciones.length === 0) {
            return null;
        }

        return indicaciones[0];
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
