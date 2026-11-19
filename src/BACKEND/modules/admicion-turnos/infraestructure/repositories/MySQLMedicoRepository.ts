import { Database } from "../../../../database/connectionDB.js";
import type { RowDataPacket } from "mysql2";

import type { Medico } from "../../domain/entities/Medico.js";
import type { IMedicoRepository } from "../../domain/repositories/IMedicoRepository.js";

interface MedicoRow extends RowDataPacket {
    id: number;
    nombre: string;
    apellido: string;
}

export class MySQLMedicoRepository implements IMedicoRepository {
    private readonly database: Database;

    constructor() {
        this.database = Database.getInstance();
    }

    async listarTodos(): Promise<Medico[]> {
        const sql = `
            SELECT
                id,
                nombre,
                apellido
            FROM usuarios
            WHERE rol = ?
            ORDER BY apellido ASC, nombre ASC
        `;

        const [resultado] = await this.database.query(sql, ["Médico"]);

        const filas = resultado as MedicoRow[];

        return filas.map((fila) => ({
            id: Number(fila.id),
            nombre: fila.nombre,
            apellido: fila.apellido
        }));
    }
}