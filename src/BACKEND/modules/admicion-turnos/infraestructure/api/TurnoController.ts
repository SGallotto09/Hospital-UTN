import type { Request, RequestHandler } from "express";

import type {
    EstadoTurnoNombre
} from "../../domain/states/turno/EstadoTurno.js";

import type {
    ConsultarAgendaMedica
} from "../../application/use-cases/agenda/ConsultarAgendaMedica.js";

import type {
    ReservarTurno
} from "../../application/use-cases/turnos/ReservarTurno.js";

import type {
    CancelarTurno
} from "../../application/use-cases/turnos/CancelarTurno.js";

import type {
    CambiarEstadoTurno
} from "../../application/use-cases/turnos/CambiarEstadoTurno.js";

import type {
    InsertarEntreturno
} from "../../application/use-cases/turnos/InsertarEntreTurno.js";

import type { Turno } from "../../domain/entities/Turno.js";


function convertirId(valor: unknown): number | null {
    const id = Number(valor);

    return Number.isSafeInteger(id) && id > 0
        ? id
        : null;
}


function convertirFecha(valor: unknown): Date | null {
    if (typeof valor !== "string" || !valor.trim()) {
        return null;
    }

    const fecha = new Date(valor);

    return Number.isNaN(fecha.getTime())
        ? null
        : fecha;
}


function obtenerUsuarioId(req: Request): number | null {
    return convertirId(req.session.usuarioId);
}


export class TurnoController {

    constructor(
        private readonly consultarAgenda: ConsultarAgendaMedica,
        private readonly reservarTurno: ReservarTurno,
        private readonly cancelarTurno: CancelarTurno,
        private readonly cambiarEstadoTurno: CambiarEstadoTurno,
        private readonly casoInsertarEntreturno: InsertarEntreturno
    ) {}


    // GET /agenda
    listarAgenda: RequestHandler = async (req, res, next) => {
        try {
            const idMedico = convertirId(req.query.idMedico);
            const fecha = req.query.fecha;

            if (
                !idMedico ||
                typeof fecha !== "string" ||
                !fecha.trim()
            ) {
                res.status(400).json({
                    mensaje: "Debe indicar un médico y una fecha válida."
                });
                return;
            }

            const turnos = await this.consultarAgenda.ejecutar({
                idMedico,
                fecha
            });

            res.status(200).json({
                turnos: turnos.map((turno) => this.serializarTurno(turno))
            });

        } catch (error) {
            next(error);
        }
    };


    // POST /
    reservar: RequestHandler = async (req, res, next) => {
        try {
            const cuerpo = req.body ?? {};

            const idRecepcionista = obtenerUsuarioId(req);
            const idPaciente = convertirId(cuerpo.idPaciente);
            const idMedico = convertirId(cuerpo.idMedico);

            const fechaHoraInicio = convertirFecha(
                cuerpo.fechaHoraInicio
            );

            const fechaHoraFin = convertirFecha(
                cuerpo.fechaHoraFin
            );

            const costo = Number(cuerpo.costo);

            if (
                !idRecepcionista ||
                !idPaciente ||
                !idMedico ||
                !fechaHoraInicio ||
                !fechaHoraFin ||
                !Number.isSafeInteger(costo) ||
                costo < 0
            ) {
                res.status(400).json({
                    mensaje: "Los datos enviados para reservar el turno no son válidos."
                });
                return;
            }

            const turno = await this.reservarTurno.ejecutar({
                idPaciente,
                idMedico,
                idRecepcionista,
                fechaHoraInicio,
                fechaHoraFin,
                costo
            });

            res.status(201).json({
                mensaje: "Turno reservado correctamente.",
                turno: this.serializarTurno(turno)
            });

        } catch (error) {
            next(error);
        }
    };


    // DELETE /:id
    cancelar: RequestHandler = async (req, res, next) => {
        try {
            const idTurno = convertirId(req.params.id);
            const idRecepcionista = obtenerUsuarioId(req);

            if (!idTurno || !idRecepcionista) {
                res.status(400).json({
                    mensaje: "El identificador del turno no es válido."
                });
                return;
            }

            const resultado = await this.cancelarTurno.ejecutar({
                idTurno,
                idRecepcionista
            });

            res.status(200).json({
                mensaje: "Turno cancelado correctamente.",

                turnoCancelado: this.serializarTurno(
                    resultado.turnoCancelado
                ),

                turnoAsignado: resultado.turnoAsignado
                    ? this.serializarTurno(resultado.turnoAsignado)
                    : null
            });

        } catch (error) {
            next(error);
        }
    };


    // PATCH /:id/estado
    cambiarEstado: RequestHandler = async (req, res, next) => {
        try {
            const idTurno = convertirId(req.params.id);
            const nuevoEstado = req.body?.nuevoEstado;

            const estadosPermitidos: EstadoTurnoNombre[] = [
                "Programado",
                "Confirmado",
                "En Sala de Espera",
                "Atendido"
            ];

            if (
                !idTurno ||
                typeof nuevoEstado !== "string" ||
                !estadosPermitidos.includes(
                    nuevoEstado as EstadoTurnoNombre
                )
            ) {
                res.status(400).json({
                    mensaje: "El identificador o el estado enviado no son válidos."
                });
                return;
            }

            await this.cambiarEstadoTurno.ejecutar({
                idTurno,
                nuevoEstado: nuevoEstado as EstadoTurnoNombre
            });

            res.status(200).json({
                mensaje: "Estado del turno actualizado correctamente."
            });

        } catch (error) {
            next(error);
        }
    };


    // POST /:id/entreturno
    insertarEntreturno: RequestHandler = async (req, res, next) => {
        try {
            const cuerpo = req.body ?? {};

            const idTurnoOriginal = convertirId(req.params.id);
            const idPaciente = convertirId(cuerpo.idPaciente);
            const idRecepcionista = obtenerUsuarioId(req);

            const fechaHoraInicio = convertirFecha(
                cuerpo.fechaHoraInicio
            );

            const costo = Number(cuerpo.costo);

            if (
                !idTurnoOriginal ||
                !idPaciente ||
                !idRecepcionista ||
                !fechaHoraInicio ||
                !Number.isSafeInteger(costo) ||
                costo < 0
            ) {
                res.status(400).json({
                    mensaje: "Los datos enviados para el entreturno no son válidos."
                });
                return;
            }

            const turno = await this.casoInsertarEntreturno.ejecutar({
                idTurnoOriginal,
                idPaciente,
                idRecepcionista,
                fechaHoraInicio,
                costo
            });

            res.status(201).json({
                mensaje: "Entreturno registrado correctamente.",
                turno: this.serializarTurno(turno)
            });

        } catch (error) {
            next(error);
        }
    };


    // Normaliza la respuesta de los turnos para el frontend
    private serializarTurno(turno: Turno) {
        return {
            id: turno.id,
            idPaciente: turno.idPaciente,
            idMedico: turno.idMedico,
            idRecepcionista: turno.idRecepcionista,
            fechaHoraInicio: turno.fechaHoraInicio.toISOString(),
            fechaHoraFin: turno.fechaHoraFin.toISOString(),
            estado: turno.estado,
            costo: turno.costo
        };
    }

}