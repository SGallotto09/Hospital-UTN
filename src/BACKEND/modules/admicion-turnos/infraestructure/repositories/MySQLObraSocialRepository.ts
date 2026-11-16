import { Database } from "../../../../database/connectionDB.js";

import type { RowDataPacket } from "mysql2";

import type {
    ObraSocial
} from "../../domain/entities/ObraSocial.js";

import type {
    IObraSocialRepository
} from "../../domain/repositories/IObraSocialRepository.js";


interface ObraSocialRow extends RowDataPacket {
    id: number;
    nombre: string;
}


export class MySQLObraSocialRepository implements IObraSocialRepository {

    private readonly database: Database;

    constructor() {
        this.database = Database.getInstance();
    }


    async listarTodos(): Promise<ObraSocial[]> {

        const sql = `
            SELECT
                id,
                nombre
            FROM obras_sociales
            ORDER BY nombre ASC
        `;

        const [resultado] = await this.database.query(sql);

        const filas = resultado as ObraSocialRow[];

        return filas.map((fila) => ({
            id: Number(fila.id),
            nombre: fila.nombre
        }));

    }

}