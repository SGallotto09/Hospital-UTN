
import { Router, type RequestHandler } from "express";
import { TriajeController } from "./TriajeController.js";

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

        this.router.post("/", this.controller.registrar);
    }

    obtenerRouter() {
        return this.router;
    }
}
