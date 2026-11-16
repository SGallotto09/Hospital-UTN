import { Database } from "../../../../database/connectionDB.js";
import { Paciente } from "../../domain/entities/Paciente.js";

import type {
    IPacienteRepository
} from "../../domain/repositories/IPacienteRepository.js";

import type {
    ResultSetHeader,
    RowDataPacket
} from "mysql2";


// Representación de una fila de la tabla pacientes
interface PacienteRow extends RowDataPacket {

    id: number;
    nombre: string;
    apellido: string;
    dni: string;
    fecha_nacimiento: string;
    genero: string;
    telefono: string;
    email: string;
    obra_social: number;

}


export class MySQLPacienteRepository implements IPacienteRepository {

    private readonly database: Database;


    constructor() {

        this.database = Database.getInstance();

    }


    // Buscar paciente por ID
    async buscarPorId(id: number): Promise<Paciente | null> {

        const sql = `
            SELECT
                id,
                nombre,
                apellido,
                dni,
                DATE_FORMAT(fecha_nacimiento, '%Y-%m-%d') AS fecha_nacimiento,
                genero,
                telefono,
                email,
                obra_social
            FROM pacientes
            WHERE id = ?
        `;

        const [resultado] = await this.database.query(sql, [id]);

        const filas = resultado as PacienteRow[];

        const fila = filas[0];

        if (!fila) {
            return null;
        }

        return this.mapearPaciente(fila);

    }


    // Buscar paciente por DNI
    async buscarPorDni(dni: string): Promise<Paciente | null> {

        const sql = `
            SELECT
                id,
                nombre,
                apellido,
                dni,
                DATE_FORMAT(fecha_nacimiento, '%Y-%m-%d') AS fecha_nacimiento,
                genero,
                telefono,
                email,
                obra_social
            FROM pacientes
            WHERE dni = ?
        `;

        const [resultado] = await this.database.query(
            sql,
            [dni.trim()]
        );

        const filas = resultado as PacienteRow[];

        const fila = filas[0];

        if (!fila) {
            return null;
        }

        return this.mapearPaciente(fila);

    }


    // Registrar un nuevo paciente
    async guardar(paciente: Paciente): Promise<Paciente> {

        if (paciente.id !== null) {

            throw new Error(
                "No se puede registrar un paciente que ya tiene un ID."
            );

        }


        const sql = `
            INSERT INTO pacientes (
                nombre,
                apellido,
                dni,
                fecha_nacimiento,
                genero,
                telefono,
                email,
                obra_social
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;


        try {

            const [resultado] = await this.database.query(
                sql,
                [
                    paciente.nombre,
                    paciente.apellido,
                    paciente.dni,
                    paciente.fechaNacimiento,
                    paciente.genero,
                    paciente.telefono,
                    paciente.email,
                    paciente.obraSocial
                ]
            );


            const insertResult = resultado as ResultSetHeader;

            const nuevoId = insertResult.insertId;


            if (!nuevoId) {

                throw new Error(
                    "No se pudo obtener el ID del paciente registrado."
                );

            }


            // Reconstruir la entidad con el ID generado por MySQL
            return Paciente.reconstituir({

                id: nuevoId,

                nombre: paciente.nombre,

                apellido: paciente.apellido,

                dni: paciente.dni,

                fechaNacimiento: paciente.fechaNacimiento,

                genero: paciente.genero,

                telefono: paciente.telefono,

                email: paciente.email,

                obraSocial: paciente.obraSocial

            });

        } catch (error) {

            const errorSQL = error as { code?: string };

            if (errorSQL.code === "ER_DUP_ENTRY") {

                throw new Error(
                    "Ya existe un paciente registrado con ese DNI."
                );

            }

            throw error;

        }

    }


    // Actualizar los datos de un paciente
    async actualizar(paciente: Paciente): Promise<void> {

        if (paciente.id === null) {

            throw new Error(
                "No se puede actualizar un paciente sin identificador."
            );

        }


        const sql = `
            UPDATE pacientes
            SET
                nombre = ?,
                apellido = ?,
                dni = ?,
                fecha_nacimiento = ?,
                genero = ?,
                telefono = ?,
                email = ?,
                obra_social = ?
            WHERE id = ?
        `;


        const [resultado] = await this.database.query(
            sql,
            [
                paciente.nombre,
                paciente.apellido,
                paciente.dni,
                paciente.fechaNacimiento,
                paciente.genero,
                paciente.telefono,
                paciente.email,
                paciente.obraSocial,
                paciente.id
            ]
        );


        const updateResult = resultado as ResultSetHeader;


        // affectedRows puede ser cero si los datos no cambiaron.
        // Por eso comprobamos si el paciente realmente existe.
        if (updateResult.affectedRows === 0) {

            const pacienteExistente = await this.buscarPorId(
                paciente.id
            );

            if (!pacienteExistente) {

                throw new Error(
                    "No se encontró el paciente que se intenta actualizar."
                );

            }

        }

    }


    // Convertir una fila de MySQL en una entidad Paciente
    private mapearPaciente(fila: PacienteRow): Paciente {

        return Paciente.reconstituir({

            id: Number(fila.id),

            nombre: fila.nombre,

            apellido: fila.apellido,

            dni: fila.dni,

            fechaNacimiento: fila.fecha_nacimiento,

            genero: fila.genero,

            telefono: fila.telefono,

            email: fila.email,

            obraSocial: Number(fila.obra_social)

        });

    }

}
