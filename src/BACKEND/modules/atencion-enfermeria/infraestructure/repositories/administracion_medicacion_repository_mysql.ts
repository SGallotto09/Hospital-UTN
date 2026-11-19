import type { ResultSetHeader } from 'mysql2/promise';
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

        if (await this.existeDosisAdministrada(id_indicacion_medica, horario_programado)) {
            throw new ErrorEnfermeria('Esta dosis ya fue administrada', 409);
        }

        const [filas] = await this.db.query(`
            SELECT id_insumo, cantidad, id_paciente
            FROM indicacion_medica
            WHERE id = ?
        `, [id_indicacion_medica]);
        const indicaciones = filas as { id_insumo: number; cantidad: number; id_paciente: number }[];
        const indicacion = indicaciones[0];
        if (!indicacion) throw new ErrorEnfermeria('No se encontró el insumo indicado', 404);

        const cantidad_realmente_administrada = cantidad_administrada ?? indicacion.cantidad;
        if (!Number.isSafeInteger(indicacion.cantidad) || indicacion.cantidad <= 0 ||
            cantidad_realmente_administrada !== indicacion.cantidad) {
            throw new ErrorEnfermeria('La cantidad administrada debe coincidir con la cantidad indicada', 400);
        }

        const [filas_asignacion] = await this.db.query(`
            SELECT c.piso
            FROM asignaciones_camas ac
            INNER JOIN camas c ON c.id = ac.id_cama
            WHERE ac.id_paciente = ? AND ac.fecha_egreso IS NULL
            ORDER BY ac.fecha_ingreso DESC, ac.id DESC
        `, [indicacion.id_paciente]);
        const asignaciones = filas_asignacion as { piso: number }[];
        if (asignaciones.length !== 1 || !Number.isSafeInteger(asignaciones[0]?.piso)) {
            throw new ErrorEnfermeria('El paciente debe tener una única cama activa con piso válido', 409);
        }
        const piso = asignaciones[0].piso;

        const [filas_stock] = await this.db.query(
            'SELECT stock FROM insumos WHERE id = ? AND piso = ?',
            [indicacion.id_insumo, piso]
        );
        const stock = (filas_stock as { stock: number }[])[0]?.stock;
        if (!Number.isSafeInteger(stock) || stock < cantidad_realmente_administrada) {
            throw new ErrorEnfermeria('No hay stock suficiente para administrar la medicación', 409);
        }

        const [resultado_insertar] = await this.db.query(`
            INSERT INTO administracion_medicacion
                (id_indicacion_medica, estado, id_enfermero, fecha_hora)
            VALUES (?, 'Administrada', ?, ?)

        `, [id_indicacion_medica, id_enfermero, fecha_hora]);
        const id_administracion_medicacion =
            (resultado_insertar as ResultSetHeader).insertId;
        if (!Number.isSafeInteger(id_administracion_medicacion) || id_administracion_medicacion <= 0) {
            throw new Error('MySQL no devolvió un ID válido para la administración');
        }

        try {

            await this.db.query(`
                INSERT INTO consumos_medicacion
                    (id_administracion, id_insumo, cantidad, piso, estado)
                VALUES (?, ?, ?, ?, 'pendiente')
            `, [id_administracion_medicacion, indicacion.id_insumo, cantidad_realmente_administrada, piso]);
            return id_administracion_medicacion;
        } catch (error) {
            try {
                const [filas_consumo] = await this.db.query(`
                    SELECT id_insumo, cantidad, piso
                    FROM consumos_medicacion
                    WHERE id_administracion = ?
                `, [id_administracion_medicacion]);
                const consumos = filas_consumo as {
                    id_insumo: number;
                    cantidad: number;
                    piso: number;
                }[];
                const consumo = consumos[0];

                if (consumos.length === 1 && consumo &&
                    consumo.id_insumo === indicacion.id_insumo &&
                    consumo.cantidad === cantidad_realmente_administrada &&
                    consumo.piso === piso) {

                    return id_administracion_medicacion;
                }

                if (consumos.length > 1) {
                    console.error(`Se encontraron varios consumos para la administración ${id_administracion_medicacion}; requiere revisión.`);
                } else if (consumo) {
                    console.error(`El consumo de la administración ${id_administracion_medicacion} existe con datos distintos; requiere revisión.`);
                } else {
                    console.error(`La consulta no encontró un consumo para la administración ${id_administracion_medicacion}. La administración clínica se conserva para revisión.`);
                }
            } catch (error_lectura) {

                console.error(
                    `No se pudo determinar el estado del consumo de la administración ${id_administracion_medicacion}; la administración clínica se conserva.`,
                    error_lectura
                );
            }
            throw error;
        }
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
