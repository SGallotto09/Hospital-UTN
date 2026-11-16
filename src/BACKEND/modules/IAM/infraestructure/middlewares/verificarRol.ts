import type { Request, Response, NextFunction } from "express";

export function verificarRol(rolesPermitidos: string[]) {
    return (
        req: Request,
        res: Response,
        next: NextFunction
    ): void => {

        if (!req.session.usuarioId || !req.session.rol) {
            res.status(401).json({
                mensaje: "Debes iniciar sesión"
            });
            return;
        }

        if (!rolesPermitidos.includes(req.session.rol)) {
            res.status(403).json({
                mensaje: "No tienes permisos para realizar esta acción"
            });
            return;
        }

        next();
    };
}