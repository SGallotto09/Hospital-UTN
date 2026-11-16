
import type { Request, RequestHandler } from "express";

import type {
    NivelUrgencia
} from "../../domain/entities/Triaje.js";

import type {
    RegistrarTriaje
} from "../../application/use-cases/triaje/RegistrarTriaje.js";

export class TriajeController {

    constructor(
        private readonly registrarTriaje: RegistrarTriaje
    ) {}

    registrar: RequestHandler = async (req, res, next) => {
        try {
            const cuerpo = req.body ?? {};

            const idPaciente = Number(cuerpo.idPaciente);
            const idEnfermero = Number(req.session.usuarioId);

            const nivelUrgencia = cuerpo.nivelUrgencia;
            const observaciones = cuerpo.observaciones ?? null;

            if (
                !Number.isSafeInteger(idPaciente) ||
                idPaciente <= 0 ||
                !Number.isSafeInteger(idEnfermero) ||
                idEnfermero <= 0 ||
                typeof nivelUrgencia !== "string" ||
                (observaciones !== null &&
                    typeof observaciones !== "string")
            ) {
                res.status(400).json({
                    mensaje: "Los datos enviados para registrar el triaje no son válidos."
                });
                return;
            }

            const triaje = await this.registrarTriaje.ejecutar({
                idPaciente,
                idEnfermero,
                nivelUrgencia: nivelUrgencia as NivelUrgencia,
                observaciones
            });

            res.status(201).json({
                mensaje: "Triaje registrado correctamente.",
                triaje
            });

        } catch (error) {
            next(error);
        }
    };
}
