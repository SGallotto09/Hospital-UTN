
import { Router, type RequestHandler } from "express";

import { TurnoController } from "./TurnoController.js";

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
            this.controller.listarAgenda
        );

        this.router.post(
            "/",
            this.controller.reservar
        );

        this.router.delete(
            "/:id",
            this.controller.cancelar
        );

        this.router.patch(
            "/:id/estado",
            this.controller.cambiarEstado
        );

        this.router.post(
            "/:id/entreturno",
            this.controller.insertarEntreturno
        );
    }

    obtenerRouter() {
        return this.router;
    }
}
