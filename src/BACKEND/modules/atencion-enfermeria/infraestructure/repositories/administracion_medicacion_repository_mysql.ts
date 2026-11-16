import type { ResultSetHeader } from 'mysql2/promise';
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
    horario_programado: Date,
    cantidad_administrada?: number
): Promise<number> {

    if (cantidad_administrada !== undefined &&
        (!Number.isSafeInteger(cantidad_administrada) || cantidad_administrada <= 0)) {
        throw new Error('La cantidad administrada debe ser un entero positivo');
    }

    if (await this.existeDosisAdministrada(id_indicacion_medica, horario_programado)) {
        throw new Error('Esta dosis ya fue administrada');
    }

    const sqlBuscar = `
        SELECT
            im.id_insumo,
            im.cantidad,
            im.id_paciente
        FROM indicacion_medica im
        INNER JOIN insumos i ON i.id = im.id_insumo
        WHERE im.id = ?
    `;

    const [filas] = await this.db.query(sqlBuscar, [
        id_indicacion_medica
    ]);

    const indicaciones = filas as {
        id_insumo: number;
        cantidad: number;
        id_paciente: number;
    }[];

    if (indicaciones.length === 0) {
        throw new Error('No se encontró el insumo indicado');
    }

    const indicacion = indicaciones[0];
    const cantidad_realmente_administrada = cantidad_administrada ?? indicacion.cantidad;

    if (!Number.isSafeInteger(indicacion.cantidad) || indicacion.cantidad <= 0 ||
        cantidad_realmente_administrada !== indicacion.cantidad) {
        throw new Error('La cantidad administrada debe coincidir con la cantidad indicada');
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
        throw new Error('El paciente debe tener una única cama activa con piso válido');
    }
    const piso = asignaciones[0].piso;

    const sqlDescontar = `
        UPDATE insumos
        SET stock = stock - ?
        WHERE id = ? AND piso = ? AND stock >= ?
    `;

    const [resultado] = await this.db.query(sqlDescontar, [
        cantidad_realmente_administrada,
        indicacion.id_insumo,
        piso,
        cantidad_realmente_administrada
    ]);

    const actualizacion = resultado as { affectedRows: number };

    if (actualizacion.affectedRows === 0) {
        throw new Error('No hay stock suficiente para administrar la medicación');
    }

    const sqlInsertar = `
        INSERT INTO administracion_medicacion
            (id_indicacion_medica, estado, id_enfermero, fecha_hora)
        VALUES (?, ?, ?, ?)
    `;

    let id_administracion_medicacion: number | undefined;
    try {
        const [resultado_insertar] = await this.db.query(sqlInsertar, [
            id_indicacion_medica,
            'Administrada',
            id_enfermero,
            fecha_hora
        ]);
        id_administracion_medicacion =
            (resultado_insertar as ResultSetHeader).insertId;
        if (!Number.isSafeInteger(id_administracion_medicacion) || id_administracion_medicacion <= 0) {
            throw new Error('MySQL no devolvió un ID válido para la administración');
        }

        // El stock ya se descontó; el estado procesado evita un segundo descuento
        // del worker de Recursos-Camas y deja el consumo disponible para Facturación.
        await this.db.query(`
            INSERT INTO consumos_medicacion
                (id_administracion, id_insumo, cantidad, piso, estado)
            VALUES (?, ?, ?, ?, 'procesado')
        `, [id_administracion_medicacion, indicacion.id_insumo, cantidad_realmente_administrada, piso]);

        return id_administracion_medicacion;
    } catch (error) {
        if (id_administracion_medicacion !== undefined) {
            try {
                await this.db.query(
                    'DELETE FROM consumos_medicacion WHERE id_administracion = ?',
                    [id_administracion_medicacion]
                );
            } catch (error_limpieza_consumo) {
                console.error('No se pudo limpiar el consumo de medicación incompleto:', error_limpieza_consumo);
            }
            try {
                await this.db.query(
                    'DELETE FROM administracion_medicacion WHERE id = ?',
                    [id_administracion_medicacion]
                );
            } catch (error_limpieza_administracion) {
                console.error('No se pudo limpiar la administración incompleta:', error_limpieza_administracion);
            }
        }

        try {
            const [resultado_compensacion] = await this.db.query(`
                UPDATE insumos SET stock = stock + ? WHERE id = ? AND piso = ?
            `, [cantidad_realmente_administrada, indicacion.id_insumo, piso]);
            if ((resultado_compensacion as { affectedRows: number }).affectedRows !== 1) {
                console.error('La compensación del stock no afectó una fila; se requiere revisión manual.');
            }
        } catch (error_compensacion) {
            console.error(
                'Falló el registro de administración/consumo y también la compensación del stock:',
                error_compensacion
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
