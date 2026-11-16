import { Router } from "express";
import type { RegistroController } from "./RegistroController.js";
import { verificarRol } from "../middlewares/verificarRol.js";
export class RegistroRoutes {
    private router: Router;

    constructor(private registroController: RegistroController) {
        this.router = Router();
        this.configurarRutas();
    }

    private configurarRutas(): void {
        this.router.post(
    "/registro",
    verificarRol(["Administrador"]),
    (req, res) => this.registroController.registrar(req, res)
);
    }

    obtenerRouter(): Router {
        return this.router;
    }
}