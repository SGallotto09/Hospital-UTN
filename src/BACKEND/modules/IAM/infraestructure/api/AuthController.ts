import type { Request, Response } from "express";
import { IniciarSesion } from "../../use-cases/IniciarSesion.js";
import type { DatosInicioSesion } from "../../use-cases/IniciarSesion.js";

export class AuthController {

    constructor(
        private iniciarSesion: IniciarSesion
    ) {}

    async login(req: Request, res: Response): Promise<void> {

        try {
            const datos: DatosInicioSesion = req.body;

            const resultado = await this.iniciarSesion.ejecutar(datos);

req.session.regenerate((error) => {
    if (error) {
        res.status(500).json({
            mensaje: "Error al iniciar la sesión"
        });
        return;
    }

    req.session.usuarioId = resultado.id;
    req.session.rol = resultado.rol;

    res.status(200).json({
        mensaje: "Inicio de sesión exitoso",
        usuario: {
            id: resultado.id,
            nombre: resultado.nombre,
            apellido: resultado.apellido,
            usuario: resultado.usuario,
            rol: resultado.rol
        }
    });
});

        } catch (error) {
            res.status(401).json({
                mensaje: error instanceof Error
                    ? error.message
                    : "Error al iniciar sesión"
            });
        }
    
    }
async logout(req: Request, res: Response): Promise<void> {
    req.session.destroy((error) => {
        if (error) {
            res.status(500).json({
                mensaje: "Error al cerrar sesión"
            });
            return;
        }

        res.clearCookie("connect.sid");

        res.status(200).json({
            mensaje: "Sesión cerrada correctamente"
        });
    });
}

}