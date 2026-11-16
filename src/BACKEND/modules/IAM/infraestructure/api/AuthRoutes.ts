import { Router } from "express";
import type { AuthController } from "./AuthController.js";

export class AuthRoutes {

    private router: Router;

    constructor(private authController: AuthController) {
        this.router = Router();
        this.configurarRutas();
    }

    private configurarRutas(): void {
        this.router.post(
            "/login",
            (req, res) => this.authController.login(req, res)
        );
   this.router.post(
    "/logout",
    (req, res) => this.authController.logout(req, res)
);
    }

    obtenerRouter(): Router {
        return this.router;
    }
}