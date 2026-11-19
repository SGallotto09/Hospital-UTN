
import type { RequestHandler } from "express";

import type { NivelUrgencia } from "../../domain/entities/Triaje.js";
import type { RegistrarTriaje } from "../../application/use-cases/triaje/RegistrarTriaje.js";
import type { ListarTriajes } from "../../application/use-cases/triaje/ListarTriajes.js";
import type { CambiarEstadoTriaje } from "../../application/use-cases/triaje/CambiarEstadoTriaje.js";

export class TriajeController {
    constructor(
        private readonly registrarTriaje: RegistrarTriaje,
        private readonly listarTriajes: ListarTriajes,
        private readonly cambiarEstadoTriaje: CambiarEstadoTriaje
    ) {}

    private serializar(triaje: Awaited<ReturnType<RegistrarTriaje["ejecutar"]>>) {
        return {
            id: triaje.id,
            idPaciente: triaje.idPaciente,
            idEnfermero: triaje.idEnfermero,
            nivelUrgencia: triaje.nivelUrgencia,
            observaciones: triaje.observaciones,
            fechaHoraIngreso: triaje.fechaHoraIngreso.toISOString(),
            estado: triaje.estado
        };
    }

    listar: RequestHandler = async (_req, res, next) => {
        try {
            const triajes = await this.listarTriajes.ejecutar();

            res.status(200).json({
                triajes: triajes.map((triaje) => this.serializar(triaje))
            });
        } catch (error) {
            next(error);
        }
    };

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
                triaje: this.serializar(triaje)
            });
        } catch (error) {
            next(error);
        }
    };

    actualizarEstado: RequestHandler = async (req, res, next) => {
        try {
            const id = Number(req.params.id);
            const nuevoEstado = req.body?.nuevoEstado;

            if (
                !Number.isSafeInteger(id) ||
                id <= 0 ||
                typeof nuevoEstado !== "string" ||
                !["EN_ATENCION", "ATENDIDO"].includes(nuevoEstado)
            ) {
                res.status(400).json({
                    mensaje: "Los datos enviados para actualizar el triaje no son válidos."
                });
                return;
            }

            await this.cambiarEstadoTriaje.ejecutar({
                id,
                nuevoEstado: nuevoEstado as "EN_ATENCION" | "ATENDIDO"
            });

            res.status(200).json({
                mensaje: "Estado del triaje actualizado correctamente."
            });
        } catch (error) {
            if (error instanceof Error && error.message.includes("No se encontró")) {
                res.status(404).json({ mensaje: error.message });
                return;
            }

            if (
                error instanceof Error &&
                (
                    error.message.includes("Solo se puede") ||
                    error.message.includes("debe estar en atención") ||
                    error.message.includes("no permite")
                )
            ) {
                res.status(409).json({ mensaje: error.message });
                return;
            }

            next(error);
        }
    };
}
