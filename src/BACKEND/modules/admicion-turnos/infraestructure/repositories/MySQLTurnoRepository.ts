import { Database } from "../../../../database/connectionDB.js";

import { Turno } from "../../domain/entities/Turno.js";

import type {
    ITurnoRepository
} from "../../domain/repositories/ITurnoRepository.js";

import type {
    EstadoTurnoNombre
} from "../../domain/states/turno/EstadoTurno.js";

import type {
    PoolConnection
} from "mysql2/promise";

import type {
    RowDataPacket,
    ResultSetHeader
} from "mysql2";


// Representación de una fila de la tabla turnos
interface TurnoRow extends RowDataPacket {

    id: number;
    id_paciente: number;
    id_medico: number;
    id_recepcionista: number;
    fecha_hora_inicio: Date | string;
    fecha_hora_fin: Date | string;
    estado: EstadoTurnoNombre;
    costo: number;

}


export class MySQLTurnoRepository implements ITurnoRepository {

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


    // Ejecutar dentro de una transacción
    // Si ya existe una conexión externa, reutilizarla
    private async ejecutarEnTransaccion<T>(
        operacion: (connection: PoolConnection) => Promise<T>
    ): Promise<T> {

        if (this.connection) {

            return operacion(this.connection);

        }

        return this.database.ejecutarTransaccion(operacion);

    }


    // Buscar un turno por ID
    async buscarPorId(id: number): Promise<Turno | null> {

        const sql = `
            SELECT
                id,
                id_paciente,
                id_medico,
                id_recepcionista,
                fecha_hora_inicio,
                fecha_hora_fin,
                estado,
                costo
            FROM turnos
            WHERE id = ?
            LIMIT 1
        `;

        const resultado = await this.ejecutarConsulta(sql, [id]);

        const filas = resultado as TurnoRow[];

        if (filas.length === 0) {

            return null;

        }

        return this.mapearTurno(filas[0]);

    }


    // Consultar turnos de un médico dentro de un período
    async listarPorMedicoEnRango(
        idMedico: number,
        fechaInicio: Date,
        fechaFin: Date
    ): Promise<Turno[]> {

        const sql = `
            SELECT
                id,
                id_paciente,
                id_medico,
                id_recepcionista,
                fecha_hora_inicio,
                fecha_hora_fin,
                estado,
                costo
            FROM turnos
            WHERE id_medico = ?
            AND fecha_hora_inicio < ?
            AND fecha_hora_fin > ?
            ORDER BY fecha_hora_inicio ASC
        `;

        const resultado = await this.ejecutarConsulta(
            sql,
            [
                idMedico,
                fechaFin,
                fechaInicio
            ]
        );

        const filas = resultado as TurnoRow[];

        return filas.map(fila => this.mapearTurno(fila));

    }


    // Reservar un turno evitando superposiciones
    async reservarSiDisponible(turno: Turno): Promise<Turno> {

        if (turno.id !== null) {

            throw new Error(
                "No se puede reservar un turno que ya tiene identificador."
            );

        }


        return this.ejecutarEnTransaccion(async connection => {

            // 1. Bloquear la fila del médico
            // Todas las operaciones de agenda deberán utilizar
            // este mismo mecanismo de bloqueo
            await this.bloquearMedico(
                connection,
                turno.idMedico
            );


            // 2. Comprobar que el horario siga disponible
            await this.verificarDisponibilidad(
                connection,
                turno
            );


            // 3. Insertar el turno
            const nuevoId = await this.insertarTurno(
                connection,
                turno
            );


            // 4. Devolver la entidad con su ID generado
            return this.reconstituirConId(turno, nuevoId);

        });

    }


    // Actualizar un turno existente
    async actualizar(turno: Turno): Promise<void> {

        if (turno.id === null) {

            throw new Error(
                "No se puede actualizar un turno sin identificador."
            );

        }


        const sql = `
            UPDATE turnos
            SET
                id_paciente = ?,
                id_medico = ?,
                id_recepcionista = ?,
                fecha_hora_inicio = ?,
                fecha_hora_fin = ?,
                estado = ?,
                costo = ?
            WHERE id = ?
        `;


        const resultado = await this.ejecutarConsulta(
            sql,
            [
                turno.idPaciente,
                turno.idMedico,
                turno.idRecepcionista,
                turno.fechaHoraInicio,
                turno.fechaHoraFin,
                turno.estado,
                turno.costo,
                turno.id
            ]
        );


        const updateResult = resultado as ResultSetHeader;

        if (updateResult.affectedRows === 0) {

            const turnoExistente = await this.buscarPorId(turno.id);

            if (!turnoExistente) {

                throw new Error(
                    "No se encontró el turno que se intenta actualizar."
                );

            }

        }

    }


    // Acortar un turno e insertar un entreturno
    // Ambas operaciones son atómicas
    async insertarEntreturno(
        turnoOriginal: Turno,
        nuevoTurno: Turno
    ): Promise<Turno> {

        if (turnoOriginal.id === null || nuevoTurno.id !== null) {
            throw new Error(
                "Los identificadores de los turnos no son válidos para esta operación."
            );
        }

        const idTurnoOriginal = turnoOriginal.id;

        if (turnoOriginal.idMedico !== nuevoTurno.idMedico) {
            throw new Error(
                "El entreturno debe corresponder al mismo médico."
            );
        }

        if (turnoOriginal.fechaHoraFin.getTime() !== nuevoTurno.fechaHoraInicio.getTime()) {
            throw new Error(
                "El entreturno debe comenzar exactamente cuando finaliza el turno reducido."
            );
        }

        return this.ejecutarEnTransaccion(async connection => {

            // 1. Bloquear al médico
            await this.bloquearMedico(
                connection,
                turnoOriginal.idMedico
            );


            // 2. Recuperar y bloquear el turno original
            const [resultado] = await connection.execute<TurnoRow[]>(
                `
                    SELECT
                        id,
                        id_paciente,
                        id_medico,
                        id_recepcionista,
                        fecha_hora_inicio,
                        fecha_hora_fin,
                        estado,
                        costo
                    FROM turnos
                    WHERE id = ?
                    FOR UPDATE
                `,
                [idTurnoOriginal]
            );


            const filaOriginal = resultado[0];

            if (!filaOriginal) {

                throw new Error(
                    "No se encontró el turno original."
                );

            }


            // 3. Comprobar que el turno no haya cambiado
            // desde que fue consultado por el caso de uso
            const inicioOriginal = this.convertirFecha(
                filaOriginal.fecha_hora_inicio
            );

            const finOriginal = this.convertirFecha(
                filaOriginal.fecha_hora_fin
            );


            if (
                inicioOriginal.getTime() !==
                    turnoOriginal.fechaHoraInicio.getTime() ||

                finOriginal.getTime() !==
                    nuevoTurno.fechaHoraFin.getTime()
            ) {

                throw new Error(
                    "El turno original fue modificado. Actualice la agenda e intente nuevamente."
                );

            }


            if (
                filaOriginal.estado !== "Programado" &&
                filaOriginal.estado !== "Confirmado"
            ) {

                throw new Error(
                    "El turno original ya no permite insertar un entreturno."
                );

            }


            // 4. Comprobar que el nuevo horario sea válido
            if (
                nuevoTurno.fechaHoraInicio <= inicioOriginal ||
                nuevoTurno.fechaHoraInicio >= finOriginal
            ) {

                throw new Error(
                    "El horario del entreturno no es válido."
                );

            }


            // 5. Comprobar que no existan otros turnos superpuestos
            await this.verificarDisponibilidad(
                connection,
                nuevoTurno,
                idTurnoOriginal
            );


            // 6. Reducir la duración del turno original
            const [actualizacion] =
                await connection.execute<ResultSetHeader>(
                    `
                        UPDATE turnos
                        SET fecha_hora_fin = ?
                        WHERE id = ?
                    `,
                    [
                        turnoOriginal.fechaHoraFin,
                        idTurnoOriginal
                    ]
                );


            if (actualizacion.affectedRows === 0) {

                const [comprobacion] =
                    await connection.execute<RowDataPacket[]>(
                        "SELECT id FROM turnos WHERE id = ?",
                        [idTurnoOriginal]
                    );

                if (comprobacion.length === 0) {

                    throw new Error(
                        "No se pudo modificar el turno original."
                    );

                }

            }


            // 7. Insertar el nuevo entreturno
            const nuevoId = await this.insertarTurno(
                connection,
                nuevoTurno
            );


            // 8. Devolver el nuevo turno persistido
            return this.reconstituirConId(nuevoTurno, nuevoId);

        });

    }


    // Bloquear la fila del médico para serializar
    // las modificaciones de su agenda
    private async bloquearMedico(
        connection: PoolConnection,
        idMedico: number
    ): Promise<void> {

        const [resultado] = await connection.execute<RowDataPacket[]>(
            `
                SELECT id
                FROM usuarios
                WHERE id = ?
                FOR UPDATE
            `,
            [idMedico]
        );

        if (resultado.length === 0) {

            throw new Error(
                "No se encontró el médico seleccionado."
            );

        }

    }


    // Verificar si existe un turno superpuesto
    private async verificarDisponibilidad(
        connection: PoolConnection,
        turno: Turno,
        idTurnoExcluir?: number
    ): Promise<void> {

        let sql = `
            SELECT id
            FROM turnos
            WHERE id_medico = ?
            AND estado <> 'Cancelado'
            AND fecha_hora_inicio < ?
            AND fecha_hora_fin > ?
        `;

        const valores: any[] = [
            turno.idMedico,
            turno.fechaHoraFin,
            turno.fechaHoraInicio
        ];


        // Al insertar un entreturno excluimos el turno original
        if (idTurnoExcluir !== undefined) {

            sql += " AND id <> ?";

            valores.push(idTurnoExcluir);

        }

        sql += " LIMIT 1";


        const [resultado] = await connection.execute<RowDataPacket[]>(
            sql,
            valores
        );


        if (resultado.length > 0) {

            throw new Error(
                "El horario acaba de ser ocupado por otro turno."
            );

        }

    }


    // Insertar un turno en MySQL y recuperar su ID
    private async insertarTurno(
        connection: PoolConnection,
        turno: Turno
    ): Promise<number> {

        const sql = `
            INSERT INTO turnos (
                id_paciente,
                id_medico,
                id_recepcionista,
                fecha_hora_inicio,
                fecha_hora_fin,
                estado,
                costo
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;


        const [resultado] = await connection.execute<ResultSetHeader>(
            sql,
            [
                turno.idPaciente,
                turno.idMedico,
                turno.idRecepcionista,
                turno.fechaHoraInicio,
                turno.fechaHoraFin,
                turno.estado,
                turno.costo
            ]
        );


        if (!resultado.insertId) {

            throw new Error(
                "No se pudo obtener el ID del turno registrado."
            );

        }

        return resultado.insertId;

    }


    // Reconstruir una entidad con el ID generado por MySQL
    private reconstituirConId(
        turno: Turno,
        id: number
    ): Turno {

        return Turno.reconstituir({

            id,

            idPaciente: turno.idPaciente,

            idMedico: turno.idMedico,

            idRecepcionista: turno.idRecepcionista,

            fechaHoraInicio: turno.fechaHoraInicio,

            fechaHoraFin: turno.fechaHoraFin,

            estado: turno.estado,

            costo: turno.costo

        });

    }


    // Convertir los valores DATETIME de MySQL a Date
    private convertirFecha(fecha: Date | string): Date {

        if (fecha instanceof Date) {

            return new Date(fecha.getTime());

        }

        return new Date(fecha.replace(" ", "T"));

    }


    // Convertir una fila de MySQL en una entidad Turno
    private mapearTurno(fila: TurnoRow): Turno {

        return Turno.reconstituir({

            id: Number(fila.id),

            idPaciente: Number(fila.id_paciente),

            idMedico: Number(fila.id_medico),

            idRecepcionista: Number(fila.id_recepcionista),

            fechaHoraInicio: this.convertirFecha(
                fila.fecha_hora_inicio
            ),

            fechaHoraFin: this.convertirFecha(
                fila.fecha_hora_fin
            ),

            estado: fila.estado,

            costo: Number(fila.costo)

        });

    }
}
