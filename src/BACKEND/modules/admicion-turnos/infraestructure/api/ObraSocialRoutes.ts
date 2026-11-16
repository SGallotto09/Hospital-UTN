import { Router } from "express";

import type {
    ObraSocialController
} from "./ObraSocialController.js";

import {
    verificarSesion
} from "../../../IAM/infraestructure/middlewares/verificarSesion.js";


export class ObraSocialRoutes {

    private router: Router;

    constructor(
        private readonly obraSocialController: ObraSocialController
    ) {

        this.router = Router();
        this.configurarRutas();

    }


    private configurarRutas(): void {

        this.router.get(
            "/",
            verificarSesion,
            (req, res) => this.obraSocialController.listar(req, res)
        );

    }


    obtenerRouter(): Router {

        return this.router;

    }

}