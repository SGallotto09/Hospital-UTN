
import type { UsuarioRepository } from "../domain/repositories/UsuarioRepository.js";
import type { HasheadorContrasenia } from "../domain/repositories/HasheadorContrasenia.js";
import { Usuario } from "../domain/entities/Usuario.js";

export interface DatosRegistro {
    nombre: string;
    apellido: string;
    dni: string;
    email: string;
    usuario: string;
    contrasenia: string;
    rol: string;
}

export class RegistrarUsuario {
    constructor(
        private usuarioRepository: UsuarioRepository,
        private hasheadorContrasenia: HasheadorContrasenia
    ) {}

    async ejecutar(datos: DatosRegistro): Promise<Usuario> {

        if (
            !datos.nombre ||
            !datos.apellido ||
            !datos.dni ||
            !datos.email ||
            !datos.usuario ||
            !datos.contrasenia ||
            !datos.rol
        ) {
            throw new Error("Todos los campos son obligatorios");
        }

        const rolesPermitidos = [
            "Administrador",
            "Médico",
            "Enfermero",
            "Recepcionista",
            "Limpieza"
        ];

        if (!rolesPermitidos.includes(datos.rol)) {
            throw new Error("El rol seleccionado no está permitido");
        }

        const usuarioExistente =
            await this.usuarioRepository.buscarPorUsuario(datos.usuario);

        if (usuarioExistente) {
            throw new Error("El nombre de usuario ya está registrado");
        }

        const contraseniaHash =
            await this.hasheadorContrasenia.hashear(datos.contrasenia);

        const nuevoUsuario = new Usuario(
            0,
            datos.nombre,
            datos.apellido,
            datos.dni,
            datos.email,
            datos.usuario,
            contraseniaHash,
            datos.rol
        );

        return await this.usuarioRepository.guardar(nuevoUsuario);
    }
}
