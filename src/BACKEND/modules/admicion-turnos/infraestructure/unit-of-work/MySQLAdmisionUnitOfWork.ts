
import { Database } from "../../../../database/connectionDB.js";

import { MySQLTurnoRepository } from "../repositories/MySQLTurnoRepository.js";

import { MySQLListaEsperaRepository } from "../repositories/MySQLListaEsperaRepository.js";

import type {
    IAdmisionUnitOfWork,
    RepositoriosAdmisionTransaccionales
} from "../../application/ports/IAdmisionUnitOfWork.js";

import type {
    RowDataPacket
} from "mysql2";


export class MySQLAdmisionUnitOfWork implements IAdmisionUnitOfWork {

    private readonly database: Database;


    constructor() {

        this.database = Database.getInstance();

    }


    // Ejecutar operaciones dentro de una única transacción
    async ejecutar<T>(
        operacion: (
            repositorios: RepositoriosAdmisionTransaccionales
        ) => Promise<T>
    ): Promise<T> {


        return this.database.withTransaction(
            async connection => {

                // 1. Crear los repositorios utilizando
                // la misma conexión transaccional
                const repositorios: RepositoriosAdmisionTransaccionales = {

                    turnos: new MySQLTurnoRepository(connection),

                    listaEspera: new MySQLListaEsperaRepository(connection),


                    // 2. Bloquear la fila del médico
                    bloquearMedico: async (
                        idMedico: number
                    ): Promise<void> => {

                        const [resultado] =
                            await connection.execute<RowDataPacket[]>(
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

                };


                // 3. Ejecutar la operación solicitada
                // Todos los repositorios utilizan la misma conexión
                return await operacion(repositorios);

            }
        );

    }

}
