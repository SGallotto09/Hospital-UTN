
import { Router, type RequestHandler } from "express";

import { TurnoController } from "./TurnoController.js";
import { verificarRol } from "../../../IAM/infraestructure/middlewares/verificarRol.js";

export class TurnoRoutes {

    private readonly router = Router();

    constructor(
        private readonly controller: TurnoController
    ) {

        const verificarSesion: RequestHandler = (
            req,
            res,
            next
        ) => {

            if (!req.session.usuarioId || !req.session.rol) {
                res.status(401).json({
                    mensaje: "Debes iniciar sesión."
                });
                return;
            }

            next();
        };

        this.router.use(verificarSesion);

        this.router.get(
            "/agenda",
            verificarRol(["Administrador", "Recepcionista", "Médico"]),
            this.controller.listarAgenda
        );

        this.router.post(
            "/",
            verificarRol(["Administrador", "Recepcionista"]),
            this.controller.reservar
        );

        this.router.delete(
            "/:id",
            verificarRol(["Administrador", "Recepcionista"]),
            this.controller.cancelar
        );

        this.router.patch(
            "/:id/estado",
            verificarRol(["Administrador", "Recepcionista"]),
            this.controller.cambiarEstado
        );

        this.router.post(
            "/:id/entreturno",
            verificarRol(["Administrador", "Recepcionista"]),
            this.controller.insertarEntreturno
        );
    }

    obtenerRouter() {
        return this.router;
    }
}
