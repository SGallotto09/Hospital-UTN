import { Database } from "../../../../database/connectionDB.js";

import { Triaje } from "../../domain/entities/Triaje.js";

import type {
    ITriajeRepository
} from "../../domain/repositories/ITriajeRepository.js";

import type {
    EstadoTriaje
} from "../../domain/entities/Triaje.js";

import type {
    PoolConnection
} from "mysql2/promise";

import type {
    RowDataPacket,
    ResultSetHeader
} from "mysql2";


// Representación de una fila de la tabla triaje
interface TriajeRow extends RowDataPacket {

    id: number;
    id_paciente: number;
    id_enfermero: number;
    nivel_urgencia: "ROJO" | "AMARILLO" | "VERDE";
    observaciones: string | null;
    fecha_hora_ingreso: string;
    estado: EstadoTriaje;

}


export class MySQLTriajeRepository implements ITriajeRepository {

    private readonly database: Database;


    constructor(
        private readonly connection?: PoolConnection
    ) {

        this.database = Database.getInstance();

    }


    // Ejecutar consultas utilizando la conexión correspondiente
    private async ejecutarConsulta(
        sql: string,
        valores: any[] = []
    ): Promise<unknown> {

        const [resultado] = this.connection
            ? await this.connection.execute(sql, valores)
            : await this.database.query(sql, valores);

        return resultado;

    }


    // Buscar un triaje por su identificador
    async buscarPorId(id: number): Promise<Triaje | null> {

        const sql = `
            SELECT
                id,
                id_paciente,
                id_enfermero,
                nivel_urgencia,
                observaciones,
                DATE_FORMAT(
                    fecha_hora_ingreso,
                    '%Y-%m-%d %H:%i:%s'
                ) AS fecha_hora_ingreso,
                estado
            FROM triaje
            WHERE id = ?
            LIMIT 1
        `;


        const resultado = await this.ejecutarConsulta(
            sql,
            [id]
        );


        const filas = resultado as TriajeRow[];

        if (filas.length === 0) {

            return null;

        }

        return this.mapearTriaje(filas[0]);

    }


    // Registrar un nuevo triaje
    async guardar(triaje: Triaje): Promise<Triaje> {

        if (triaje.id !== null) {

            throw new Error(
                "No se puede registrar un triaje que ya tiene identificador."
            );

        }


        const sql = `
            INSERT INTO triaje (
                id_paciente,
                id_enfermero,
                nivel_urgencia,
                observaciones,
                fecha_hora_ingreso,
                estado
            )
            VALUES (?, ?, ?, ?, ?, ?)
        `;


        const [resultado] = this.connection
            ? await this.connection.execute(
                sql,
                [
                    triaje.idPaciente,
                    triaje.idEnfermero,
                    triaje.nivelUrgencia,
                    triaje.observaciones,
                    this.formatearFechaHora(triaje.fechaHoraIngreso),
                    triaje.estado
                ]
            )
            : await this.database.query(
                sql,
                [
                    triaje.idPaciente,
                    triaje.idEnfermero,
                    triaje.nivelUrgencia,
                    triaje.observaciones,
                    this.formatearFechaHora(triaje.fechaHoraIngreso),
                    triaje.estado
                ]
            );


        const insertResult = resultado as ResultSetHeader;

        if (!insertResult.insertId) {

            throw new Error(
                "No se pudo registrar el triaje."
            );

        }


        // Recuperar la entidad con el ID generado por MySQL
        const nuevoTriaje = await this.buscarPorId(
            insertResult.insertId
        );


        if (!nuevoTriaje) {

            throw new Error(
                "No se pudo recuperar el triaje registrado."
            );

        }

        return nuevoTriaje;

    }


    // Actualizar el estado de un triaje
    async actualizar(triaje: Triaje): Promise<void> {

        if (triaje.id === null) {

            throw new Error(
                "No se puede actualizar un triaje sin identificador."
            );

        }


        const sql = `
            UPDATE triaje
            SET estado = ?
            WHERE id = ?
        `;


        const resultado = await this.ejecutarConsulta(
            sql,
            [
                triaje.estado,
                triaje.id
            ]
        );


        const updateResult = resultado as ResultSetHeader;


        // affectedRows puede ser cero si el estado no cambió
        if (updateResult.affectedRows === 0) {

            const triajeExistente = await this.buscarPorId(
                triaje.id
            );

            if (!triajeExistente) {

                throw new Error(
                    "No se encontró el triaje que se intenta actualizar."
                );

            }

        }

    }


    // Obtener los registros según su estado
    async listarPorEstado(
        estado: EstadoTriaje
    ): Promise<Triaje[]> {

        const sql = `
            SELECT
                id,
                id_paciente,
                id_enfermero,
                nivel_urgencia,
                observaciones,
                DATE_FORMAT(
                    fecha_hora_ingreso,
                    '%Y-%m-%d %H:%i:%s'
                ) AS fecha_hora_ingreso,
                estado
            FROM triaje
            WHERE estado = ?
            ORDER BY fecha_hora_ingreso ASC, id ASC
        `;


        const resultado = await this.ejecutarConsulta(
            sql,
            [estado]
        );


        const filas = resultado as TriajeRow[];

        return filas.map(
            fila => this.mapearTriaje(fila)
        );

    }


    // Convertir una fila de MySQL en una entidad Triaje
    private mapearTriaje(fila: TriajeRow): Triaje {

        return Triaje.reconstituir({

            id: Number(fila.id),

            idPaciente: Number(fila.id_paciente),

            idEnfermero: Number(fila.id_enfermero),

            nivelUrgencia: fila.nivel_urgencia,

            observaciones: fila.observaciones,

            fechaHoraIngreso: this.convertirFechaHora(
                fila.fecha_hora_ingreso
            ),

            estado: fila.estado

        });

    }


    // Convertir DATETIME de MySQL a Date
    private convertirFechaHora(fecha: string): Date {

        const fechaConvertida = new Date(
            fecha.replace(" ", "T")
        );


        if (Number.isNaN(fechaConvertida.getTime())) {

            throw new Error(
                "La fecha y hora del triaje no son válidas."
            );

        }

        return fechaConvertida;

    }


    // Convertir Date a formato DATETIME de MySQL
    private formatearFechaHora(fecha: Date): string {

        const anio = fecha.getFullYear();

        const mes = String(
            fecha.getMonth() + 1
        ).padStart(2, "0");

        const dia = String(
            fecha.getDate()
        ).padStart(2, "0");

        const horas = String(
            fecha.getHours()
        ).padStart(2, "0");

        const minutos = String(
            fecha.getMinutes()
        ).padStart(2, "0");

        const segundos = String(
            fecha.getSeconds()
        ).padStart(2, "0");

        return `${anio}-${mes}-${dia} ${horas}:${minutos}:${segundos}`;

    }

}
