import { Router } from "express";
import type { AuthController } from "./AuthController.js";
import { verificarSesion } from "../middlewares/verificarSesion.js";

export class AuthRoutes {

    private router: Router;

    constructor(private authController: AuthController) {
        this.router = Router();
        this.configurarRutas();
    }

    private configurarRutas(): void {
        this.router.use((_req, res, next) => {
            res.setHeader("Cache-Control", "no-store");
            next();
        });
        this.router.get("/sesion", verificarSesion, (req, res) => this.authController.sesion(req, res));
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
