
import { Router } from "express";

import type { PacienteController } from "./PacienteController.js";

import { verificarSesion } from "../../../IAM/infraestructure/middlewares/verificarSesion.js";
import { verificarRol } from "../../../IAM/infraestructure/middlewares/verificarRol.js";


export class PacienteRoutes {

    private router: Router;

    constructor(
        private readonly pacienteController: PacienteController
    ) {

        this.router = Router();
        this.configurarRutas();

    }


    private configurarRutas(): void {

        // Obtener todos los pacientes
        this.router.get(
            "/",
            verificarSesion,
            verificarRol(["Administrador", "Recepcionista", "Médico", "Enfermero"]),
            (req, res) => this.pacienteController.listar(req, res)
        );


        // Registrar un paciente
        this.router.post(
            "/",
            verificarSesion,
            verificarRol(["Administrador", "Recepcionista"]),
            (req, res) => this.pacienteController.registrar(req, res)
        );

    }


    obtenerRouter(): Router {

        return this.router;

    }

}
