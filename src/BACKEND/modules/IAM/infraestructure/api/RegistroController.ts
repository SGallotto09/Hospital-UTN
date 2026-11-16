
import type { Request, Response } from "express";
import { RegistrarUsuario } from "../../use-cases/RegistrarUsuario.js";
import type { DatosRegistro } from "../../use-cases/RegistrarUsuario.js";

export class RegistroController {
    constructor(private registrarUsuario: RegistrarUsuario) {}

    async registrar(req: Request, res: Response): Promise<void> {
        try {
            const datos: DatosRegistro = req.body;

            const resultado = await this.registrarUsuario.ejecutar(datos);

            res.status(201).json({
                mensaje: "Usuario registrado correctamente",
                usuario: {
                    id: resultado.id,
                    nombre: resultado.nombre,
                    apellido: resultado.apellido,
                    usuario: resultado.usuario,
                    rol: resultado.rol
                }
            });

        } catch (error) {
            res.status(400).json({
                mensaje: error instanceof Error
                    ? error.message
                    : "Error al registrar el usuario"
            });
        }
    }
}
