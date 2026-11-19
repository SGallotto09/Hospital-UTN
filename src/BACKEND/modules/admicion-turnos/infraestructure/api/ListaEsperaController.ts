
import type { RequestHandler } from "express";

import type {
    EstadoListaEspera
} from "../../domain/entities/ListaEspera.js";

import type {
    AgregarPacienteListaEspera
} from "../../application/use-cases/lista-espera/AgregarPacienteListaEspera.js";

import type {
    ListarListaEspera
} from "../../application/use-cases/lista-espera/ListarListaEspera.js";

import type {
    CancelarSolicitudListaEspera
} from "../../application/use-cases/lista-espera/CancelarSolicitudListaEspera.js";


function convertirId(valor: unknown): number | null {

    const id = Number(valor);

    return Number.isSafeInteger(id) && id > 0
        ? id
        : null;
}


function validarFecha(fecha: unknown): fecha is string {

    if (
        typeof fecha !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(fecha)
    ) {
        return false;
    }

    const [anio, mes, dia] = fecha.split("-").map(Number);

    const fechaValidada = new Date(anio, mes - 1, dia);

    return (
        fechaValidada.getFullYear() === anio &&
        fechaValidada.getMonth() === mes - 1 &&
        fechaValidada.getDate() === dia
    );
}


export class ListaEsperaController {

    constructor(
        private readonly agregarPacienteListaEspera: AgregarPacienteListaEspera,
        private readonly listarListaEspera: ListarListaEspera,
        private readonly cancelarSolicitud: CancelarSolicitudListaEspera
    ) {}


    // POST / - Agregar paciente
    agregar: RequestHandler = async (req, res, next) => {

        try {

            const cuerpo = req.body ?? {};

            const idPaciente = convertirId(cuerpo.idPaciente);
            const idMedico = convertirId(cuerpo.idMedico);
            const fechaSolicitada = cuerpo.fechaSolicitada;

            if (
                !idPaciente ||
                !idMedico ||
                !validarFecha(fechaSolicitada)
            ) {

                res.status(400).json({
                    mensaje: "Los datos enviados para la lista de espera no son válidos."
                });

                return;
            }

            const solicitud =
                await this.agregarPacienteListaEspera.ejecutar({
                    idPaciente,
                    idMedico,
                    fechaSolicitada
                });

            res.status(201).json({
                mensaje: "Paciente agregado a la lista de espera correctamente.",
                solicitud
            });

        } catch (error) {

            if (error instanceof Error) {

                if (error.message.includes("ya se encuentra")) {
                    res.status(409).json({
                        mensaje: error.message
                    });
                    return;
                }

                if (error.message.includes("paciente no existe")) {
                    res.status(404).json({
                        mensaje: error.message
                    });
                    return;
                }
            }

            next(error);
        }
    };


    // GET / - Listar solicitudes
    listar: RequestHandler = async (req, res, next) => {

        try {

            const estado = req.query.estado;

            const estadosPermitidos: EstadoListaEspera[] = [
                "EN_ESPERA",
                "ASIGNADO",
                "CANCELADO"
            ];

            if (
                estado !== undefined &&
                (
                    typeof estado !== "string" ||
                    !estadosPermitidos.includes(estado as EstadoListaEspera)
                )
            ) {

                res.status(400).json({
                    mensaje: "El estado solicitado no es válido."
                });

                return;
            }

            const solicitudes =
                await this.listarListaEspera.ejecutar(
                    estado as EstadoListaEspera | undefined
                );

            res.status(200).json({ solicitudes });

        } catch (error) {
            next(error);
        }
    };


    // DELETE /:id - Cancelar solicitud
    cancelar: RequestHandler = async (req, res, next) => {

        try {

            const id = convertirId(req.params.id);

            if (!id) {

                res.status(400).json({
                    mensaje: "El identificador de la solicitud no es válido."
                });

                return;
            }

            const solicitud = await this.cancelarSolicitud.ejecutar({
                id
            });

            res.status(200).json({
                mensaje: "Solicitud cancelada correctamente.",
                solicitud
            });

        } catch (error) {

            if (error instanceof Error) {

                if (error.message.includes("No se encontró")) {
                    res.status(404).json({
                        mensaje: error.message
                    });
                    return;
                }

                if (error.message.includes("Solamente se pueden cancelar")) {
                    res.status(409).json({
                        mensaje: error.message
                    });
                    return;
                }
            }

            next(error);
        }
    };
}
