
import { Router, type RequestHandler } from "express";
import { TriajeController } from "./TriajeController.js";
import { verificarRol } from "../../../IAM/infraestructure/middlewares/verificarRol.js";

export class TriajeRoutes {
    private readonly router = Router();

    constructor(
        private readonly controller: TriajeController
    ) {
        const verificarSesion: RequestHandler = (req, res, next) => {
            if (!req.session.usuarioId || !req.session.rol) {
                res.status(401).json({
                    mensaje: "Debes iniciar sesión."
                });
                return;
            }

            next();
        };

        this.router.use(verificarSesion);

        this.router.get("/", verificarRol(["Administrador", "Enfermero", "Recepcionista"]), this.controller.listar);
        this.router.post("/", verificarRol(["Administrador", "Enfermero"]), this.controller.registrar);
        this.router.patch("/:id/estado", verificarRol(["Administrador", "Enfermero"]), this.controller.actualizarEstado);
    }

    obtenerRouter() {
        return this.router;
    }
}
