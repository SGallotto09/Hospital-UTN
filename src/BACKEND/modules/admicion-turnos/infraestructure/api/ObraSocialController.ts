import type { Request, Response } from "express";

import type {
    ListarObrasSociales
} from "../../application/use-cases/obras-sociales/ListarObrasSociales.js";


export class ObraSocialController {

    constructor(
        private readonly listarObrasSociales: ListarObrasSociales
    ) {}


    async listar(_req: Request, res: Response): Promise<void> {

        try {

            const obrasSociales =
                await this.listarObrasSociales.ejecutar();

            res.status(200).json({
                obrasSociales
            });

        } catch (error) {

            console.error("Error al listar obras sociales:", error);

            res.status(500).json({
                mensaje: "No se pudieron obtener las obras sociales."
            });

        }

    }

}