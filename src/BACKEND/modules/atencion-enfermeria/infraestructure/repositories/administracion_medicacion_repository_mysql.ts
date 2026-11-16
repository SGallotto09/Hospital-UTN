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


    async administrar(id_indicacion_medica: number, id_enfermero: number, fecha_hora: Date): Promise<void>{

        const sqlBuscar = `
            SELECT
                im.id_insumo,
                im.cantidad,
                i.stock
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
            stock: number;
        }[];

        if (indicaciones.length === 0) {
            throw new Error('No se encontró el insumo indicado');
        }

        const indicacion = indicaciones[0];

            const sqlDescontar = `
            UPDATE insumos
            SET stock = stock - ?
            WHERE id = ?
            AND stock >= ?
        `;

        const [resultado] = await this.db.query(sqlDescontar, [
            indicacion.cantidad,
            indicacion.id_insumo,
            indicacion.cantidad
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

        await this.db.query(sqlInsertar, [
            id_indicacion_medica,
            'Administrada',
            id_enfermero,
            fecha_hora
        ]);

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