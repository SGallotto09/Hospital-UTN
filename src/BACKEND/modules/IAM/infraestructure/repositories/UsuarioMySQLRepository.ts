
import { Database } from "../../../../database/connectionDB.js";
import { Usuario } from "../../domain/entities/Usuario.js";
import type { UsuarioRepository } from "../../domain/repositories/UsuarioRepository.js";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

interface UsuarioRow extends RowDataPacket {
    id: number;
    nombre: string;
    apellido: string;
    dni: string;
    email: string;
    usuario: string;
    contrasenia: string;
    rol: string;
}

export class UsuarioMySQLRepository implements UsuarioRepository {
    private database: Database;

    constructor() {
        this.database = Database.getInstance();
    }

    async buscarPorUsuario(usuario: string): Promise<Usuario | null> {
    const [filas] = await this.database.query(
        "SELECT * FROM usuarios WHERE usuario = ?",
        [usuario]
    );

        const usuarios = filas as UsuarioRow[];

        if (usuarios.length === 0) {
            return null;
        }

        const fila = usuarios[0];

        return new Usuario(
            fila.id,
            fila.nombre,
            fila.apellido,
            fila.dni,
            fila.email,
            fila.usuario,
            fila.contrasenia,
            fila.rol
        );
    }

    async buscarPorId(id: number): Promise<Usuario | null> {
        const [filas] = await this.database.query(
            "SELECT * FROM usuarios WHERE id = ?",
            [id]
        );

        const usuarios = filas as UsuarioRow[];

        if (usuarios.length === 0) {
            return null;
        }

        const fila = usuarios[0];

        return new Usuario(
            fila.id,
            fila.nombre,
            fila.apellido,
            fila.dni,
            fila.email,
            fila.usuario,
            fila.contrasenia,
            fila.rol
        );
    }

    async guardar(usuario: Usuario): Promise<Usuario> {
        const [resultado] = await this.database.query(
            `INSERT INTO usuarios
            (nombre, apellido, dni, email, usuario, contrasenia, rol)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                usuario.nombre,
                usuario.apellido,
                usuario.dni,
                usuario.email,
                usuario.usuario,
                usuario.contrasenia,
                usuario.rol
            ]
        );

        const insertId = (resultado as ResultSetHeader).insertId;

        return new Usuario(
            insertId,
            usuario.nombre,
            usuario.apellido,
            usuario.dni,
            usuario.email,
            usuario.usuario,
            usuario.contrasenia,
            usuario.rol
        );
    }
}
