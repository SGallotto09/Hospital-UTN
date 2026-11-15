import { Usuario } from "../entities/Usuario.js";

export interface UsuarioRepository {
    buscarPorEmail(email: string): Promise<Usuario | null>;

    buscarPorId(id: number): Promise<Usuario | null>;

    guardar(usuario: Usuario): Promise<Usuario>;
}