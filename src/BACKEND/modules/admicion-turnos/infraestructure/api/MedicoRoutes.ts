import { Router } from "express";
import { verificarSesion } from "../../../IAM/infraestructure/middlewares/verificarSesion.js";
import type { MedicoController } from "./MedicoController.js";

export class MedicoRoutes {
    private readonly router = Router();

    constructor(
        private readonly controller: MedicoController
    ) {
        this.router.get(
            "/",
            verificarSesion,
            this.controller.listar
        );
    }

    obtenerRouter() {
        return this.router;
    }
}