import type { Request, Response, NextFunction } from "express";

export function verificarSesion(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    if (!req.session.usuarioId || !req.session.rol) {
        res.status(401).json({
            mensaje: "Debes iniciar sesión"
        });
        return;
    }

    next();
}