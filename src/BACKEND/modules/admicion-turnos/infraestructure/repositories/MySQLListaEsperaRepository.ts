
import { Database } from "../../../../database/connectionDB.js";

import { ListaEspera } from "../../domain/entities/ListaEspera.js";

import type {
    IListaEsperaRepository
} from "../../domain/repositories/IListaEsperaRepository.js";

import type {
    EstadoListaEspera
} from "../../domain/entities/ListaEspera.js";

import type {
    PoolConnection
} from "mysql2/promise";

import type {
    RowDataPacket,
    ResultSetHeader
} from "mysql2";


// Representación de una fila de la tabla lista_espera
interface ListaEsperaRow extends RowDataPacket {

    id: number;
    id_paciente: number;
    id_medico: number;
    fecha_solicitada: string;
    fecha_hora_ingreso: Date | string | number;
    estado: EstadoListaEspera;

}


export class MySQLListaEsperaRepository implements IListaEsperaRepository {

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
    // Si existe una conexión externa, reutilizarla
    private async ejecutarEnTransaccion<T>(
        operacion: (connection: PoolConnection) => Promise<T>
    ): Promise<T> {

        if (this.connection) {
            return operacion(this.connection);
        }

        return this.database.withTransaction(operacion);

    }


    // Registrar un paciente en la lista de espera
    async guardar(
        listaEspera: ListaEspera
    ): Promise<ListaEspera> {

        if (listaEspera.id !== null) {

            throw new Error(
                "No se puede registrar una solicitud que ya tiene identificador."
            );

        }


        return this.ejecutarEnTransaccion(async connection => {

            // 1. Bloquear el registro del paciente
            const [pacientes] = await connection.execute<RowDataPacket[]>(
                `
                    SELECT id
                    FROM pacientes
                    WHERE id = ?
                    FOR UPDATE
                `,
                [listaEspera.idPaciente]
            );


            if (pacientes.length === 0) {

                throw new Error(
                    "No se encontró el paciente seleccionado."
                );

            }


            // 2. Comprobar si ya existe una solicitud pendiente
            const [solicitudes] =
                await connection.execute<RowDataPacket[]>(
                    `
                        SELECT id
                        FROM lista_espera
                        WHERE id_paciente = ?
                        AND id_medico = ?
                        AND fecha_solicitada = ?
                        AND estado = 'EN_ESPERA'
                        LIMIT 1
                    `,
                    [
                        listaEspera.idPaciente,
                        listaEspera.idMedico,
                        listaEspera.fechaSolicitada
                    ]
                );


            if (solicitudes.length > 0) {

                throw new Error(
                    "El paciente ya se encuentra en la lista de espera para ese médico y fecha."
                );

            }


            // 3. Insertar la solicitud
            const [resultado] =
                await connection.execute<ResultSetHeader>(
                    `
                        INSERT INTO lista_espera (
                            id_paciente,
                            id_medico,
                            fecha_solicitada,
                            estado
                        )
                        VALUES (?, ?, ?, ?)
                    `,
                    [
                        listaEspera.idPaciente,
                        listaEspera.idMedico,
                        listaEspera.fechaSolicitada,
                        listaEspera.estado
                    ]
                );


            if (!resultado.insertId) {

                throw new Error(
                    "No se pudo registrar al paciente en la lista de espera."
                );

            }


            // 4. Recuperar el registro creado
            const nuevaSolicitud = await this.buscarPorIdInterno(
                connection,
                resultado.insertId
            );


            if (!nuevaSolicitud) {

                throw new Error(
                    "No se pudo recuperar la solicitud registrada."
                );

            }


            return nuevaSolicitud;

        });

    }


    // Buscar una solicitud por ID
    async buscarPorId(
        id: number
    ): Promise<ListaEspera | null> {

        return this.buscarPorIdInterno(
            this.connection,
            id
        );

    }


    // Buscar si un paciente ya tiene una solicitud pendiente
    async buscarPendientePorPaciente(
        idPaciente: number,
        idMedico: number,
        fecha: string
    ): Promise<ListaEspera | null> {

        const sql = `
            SELECT
                id,
                id_paciente,
                id_medico,
                DATE_FORMAT(fecha_solicitada, '%Y-%m-%d')
                    AS fecha_solicitada,
                DATE_FORMAT(fecha_hora_ingreso, '%Y-%m-%d %H:%i:%s')
                    AS fecha_hora_ingreso,
                estado
            FROM lista_espera
            WHERE id_paciente = ?
            AND id_medico = ?
            AND fecha_solicitada = ?
            AND estado = 'EN_ESPERA'
            ORDER BY fecha_hora_ingreso ASC, id ASC
            LIMIT 1
        `;


        const resultado = await this.ejecutarConsulta(
            sql,
            [
                idPaciente,
                idMedico,
                fecha
            ]
        );


        const filas = resultado as ListaEsperaRow[];

        if (filas.length === 0) {
            return null;
        }

        return this.mapearListaEspera(filas[0]);

    }


    // Listar todas las solicitudes, con filtro opcional por estado
    async listarTodos(
        estado?: EstadoListaEspera
    ): Promise<ListaEspera[]> {

        let sql = `
            SELECT
                id,
                id_paciente,
                id_medico,
                DATE_FORMAT(fecha_solicitada, '%Y-%m-%d')
                    AS fecha_solicitada,
                DATE_FORMAT(fecha_hora_ingreso, '%Y-%m-%d %H:%i:%s')
                    AS fecha_hora_ingreso,
                estado
            FROM lista_espera
        `;

        const valores: any[] = [];

        if (estado !== undefined) {
            sql += " WHERE estado = ?";
            valores.push(estado);
        }

        sql += `
            ORDER BY fecha_hora_ingreso ASC, id ASC
        `;

        const resultado = await this.ejecutarConsulta(
            sql,
            valores
        );

        const filas = resultado as ListaEsperaRow[];

        return filas.map(
            fila => this.mapearListaEspera(fila)
        );

    }


    // Recuperar al primer paciente de la cola
    // Esta operación debe ejecutarse dentro de una transacción
    async buscarPrimeroEnEspera(
        idMedico: number,
        fecha: string
    ): Promise<ListaEspera | null> {

        if (!this.connection) {

            throw new Error(
                "La búsqueda del primer paciente debe ejecutarse dentro de una transacción."
            );

        }


        const sql = `
            SELECT
                id,
                id_paciente,
                id_medico,
                DATE_FORMAT(fecha_solicitada, '%Y-%m-%d')
                    AS fecha_solicitada,
                DATE_FORMAT(fecha_hora_ingreso, '%Y-%m-%d %H:%i:%s')
                    AS fecha_hora_ingreso,
                estado
            FROM lista_espera
            WHERE id_medico = ?
            AND fecha_solicitada = ?
            AND estado = 'EN_ESPERA'
            ORDER BY fecha_hora_ingreso ASC, id ASC
            LIMIT 1
            FOR UPDATE
        `;


        const [resultado] = await this.connection.execute<ListaEsperaRow[]>(
            sql,
            [
                idMedico,
                fecha
            ]
        );


        if (resultado.length === 0) {
            return null;
        }

        return this.mapearListaEspera(resultado[0]);

    }


    // Actualizar el estado de una solicitud
    async actualizar(
        listaEspera: ListaEspera
    ): Promise<void> {

        if (listaEspera.id === null) {

            throw new Error(
                "No se puede actualizar una solicitud sin identificador."
            );

        }


        const sql = `
            UPDATE lista_espera
            SET estado = ?
            WHERE id = ?
        `;


        const resultado = await this.ejecutarConsulta(
            sql,
            [
                listaEspera.estado,
                listaEspera.id
            ]
        );


        const updateResult = resultado as ResultSetHeader;


        if (updateResult.affectedRows === 0) {

            const solicitudExistente = await this.buscarPorIdInterno(
                this.connection,
                listaEspera.id
            );

            if (!solicitudExistente) {

                throw new Error(
                    "No se encontró la solicitud que se intenta actualizar."
                );

            }

        }

    }


    // Buscar una solicitud por ID utilizando una conexión específica
    private async buscarPorIdInterno(
        connection: PoolConnection | undefined,
        id: number
    ): Promise<ListaEspera | null> {

        const sql = `
            SELECT
                id,
                id_paciente,
                id_medico,
                DATE_FORMAT(fecha_solicitada, '%Y-%m-%d')
                    AS fecha_solicitada,
                DATE_FORMAT(fecha_hora_ingreso, '%Y-%m-%d %H:%i:%s')
                    AS fecha_hora_ingreso,
                estado
            FROM lista_espera
            WHERE id = ?
            LIMIT 1
        `;


        const [resultado] = connection
            ? await connection.execute(sql, [id])
            : await this.database.query(sql, [id]);


        const filas = resultado as ListaEsperaRow[];

        if (filas.length === 0) {
            return null;
        }

        return this.mapearListaEspera(filas[0]);

    }
    


    // Convertir una fila de MySQL en una entidad ListaEspera
    private mapearListaEspera(
        fila: ListaEsperaRow
    ): ListaEspera {

        return ListaEspera.reconstituir({

            id: Number(fila.id),

            idPaciente: Number(fila.id_paciente),

            idMedico: Number(fila.id_medico),

            fechaSolicitada: fila.fecha_solicitada,

            fechaHoraIngreso: this.convertirFechaHora(
                fila.fecha_hora_ingreso
            ),

            estado: fila.estado

        });

    }


    // Convertir DATETIME de MySQL a Date
    private convertirFechaHora(
        fecha: Date | string | number
    ): Date {

        let resultado: Date;

        if (fecha instanceof Date) {

            resultado = new Date(fecha.getTime());

        } else if (typeof fecha === "string") {

            resultado = new Date(
                fecha.replace(" ", "T")
            );

        } else if (typeof fecha === "number") {

            resultado = new Date(fecha);

        } else {

            throw new Error(
                "El formato de fecha de ingreso no es compatible."
            );

        }

        if (Number.isNaN(resultado.getTime())) {

            throw new Error(
                "La fecha de ingreso almacenada en MySQL no es válida."
            );

        }

        return resultado;

    }

}
