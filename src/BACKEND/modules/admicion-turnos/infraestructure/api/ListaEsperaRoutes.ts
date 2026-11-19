
import { Router, type RequestHandler } from "express";

import { ListaEsperaController } from "./ListaEsperaController.js";

export class ListaEsperaRoutes {

    private readonly router = Router();

    constructor(
        private readonly controller: ListaEsperaController
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
            "/",
            this.controller.listar
        );

        this.router.post(
            "/",
            this.controller.agregar
        );

        this.router.delete(
            "/:id",
            this.controller.cancelar
        );
    }

    obtenerRouter() {
        return this.router;
    }
}
