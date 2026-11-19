import type { RequestHandler } from "express";
import type { ListarMedicos } from "../../application/use-cases/medicos/ListarMedicos.js";

export class MedicoController {
    constructor(
        private readonly listarMedicos: ListarMedicos
    ) {}

    listar: RequestHandler = async (_req, res, next) => {
        try {
            const medicos = await this.listarMedicos.ejecutar();

            res.status(200).json({ medicos });
        } catch (error) {
            next(error);
        }
    };
}