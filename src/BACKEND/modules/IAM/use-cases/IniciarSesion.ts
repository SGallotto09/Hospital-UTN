import type { UsuarioRepository } from "../domain/repositories/UsuarioRepository.js";
import { Usuario } from "../domain/entities/Usuario.js";
import type { VerificadorContrasenia } from "../domain/repositories/VerificadorContrasenia.js";

export interface DatosInicioSesion {
    usuario: string;
    contrasenia: string;
}

export class IniciarSesion {

    constructor(
        private usuarioRepository: UsuarioRepository,
        private verificadorContrasenia: VerificadorContrasenia
    ) {}

    async ejecutar(datos: DatosInicioSesion): Promise<Usuario> {

        const usuario = await this.usuarioRepository.buscarPorUsuario(
            datos.usuario
        );

        if (!usuario) {
            throw new Error("Usuario o contraseña incorrectos");
        }

        const contraseniaValida = await this.verificadorContrasenia.verificar(
            datos.contrasenia,
            usuario.contrasenia
        );

        if (!contraseniaValida) {
            throw new Error("Usuario o contraseña incorrectos");
        }

        return usuario;
    }
}