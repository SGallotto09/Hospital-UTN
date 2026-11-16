
import { Turno } from "../../../domain/entities/Turno.js";

import type {
    IAdmisionUnitOfWork
} from "../../ports/IAdmisionUnitOfWork.js";

import type {
    INotificacionService
} from "../../ports/INotificacionService.js";


export interface CancelarTurnoDTO {

    idTurno: number;

    // Debe obtenerse del usuario autenticado
    idRecepcionista: number;

}


export interface CancelarTurnoResultado {

    turnoCancelado: Turno;

    turnoAsignado: Turno | null;

}


export class CancelarTurno {

    constructor(
        private readonly unitOfWork: IAdmisionUnitOfWork,
        private readonly notificacionService: INotificacionService
    ) {}


    async ejecutar(
        datos: CancelarTurnoDTO
    ): Promise<CancelarTurnoResultado> {

        // 1. Validar el identificador del turno
        if (
            !Number.isSafeInteger(datos.idTurno) ||
            datos.idTurno <= 0
        ) {
            throw new Error(
                "El identificador del turno no es válido."
            );
        }


        // 2. Validar el identificador del recepcionista
        if (
            !Number.isSafeInteger(datos.idRecepcionista) ||
            datos.idRecepcionista <= 0
        ) {
            throw new Error(
                "El identificador del recepcionista no es válido."
            );
        }


        // 3. Ejecutar las operaciones dentro de una transacción
        const resultado = await this.unitOfWork.ejecutar(
            async ({
                turnos,
                listaEspera,
                bloquearMedico
            }) => {

                // Buscar el turno original
                const turnoInicial = await turnos.buscarPorId(
                    datos.idTurno
                );

                if (!turnoInicial) {
                    throw new Error(
                        "No se encontró el turno solicitado."
                    );
                }


                // Bloquear la agenda del médico
                await bloquearMedico(turnoInicial.idMedico);


                // Volver a consultar el turno
                const turno = await turnos.buscarPorId(
                    datos.idTurno
                );

                if (!turno) {
                    throw new Error(
                        "El turno ya no se encuentra disponible."
                    );
                }

                if (
                    turno.idMedico !== turnoInicial.idMedico
                ) {
                    throw new Error(
                        "El médico asignado al turno fue modificado."
                    );
                }


                // Cancelar el turno mediante State
                turno.cambiarEstado("Cancelado");

                await turnos.actualizar(turno);


                // Obtener la fecha solicitada
                const fecha = this.formatearFecha(
                    turno.fechaHoraInicio
                );


                // Buscar al primer paciente de la lista de espera
                const siguientePaciente =
                    await listaEspera.buscarPrimeroEnEspera(
                        turno.idMedico,
                        fecha
                    );


                // Si no hay pacientes esperando,
                // devolver solamente el turno cancelado
                if (!siguientePaciente) {

                    return {
                        turnoCancelado: turno,
                        turnoAsignado: null
                    };

                }


                // Crear un nuevo turno para el paciente
                const nuevoTurno = Turno.crear({

                    idPaciente: siguientePaciente.idPaciente,

                    idMedico: turno.idMedico,

                    idRecepcionista: datos.idRecepcionista,

                    fechaHoraInicio: turno.fechaHoraInicio,

                    fechaHoraFin: turno.fechaHoraFin,

                    costo: turno.costo

                });


                // Reservar el horario liberado
                const turnoAsignado =
                    await turnos.reservarSiDisponible(nuevoTurno);


                // Marcar la solicitud como asignada
                siguientePaciente.marcarComoAsignado();

                await listaEspera.actualizar(siguientePaciente);


                return {
                    turnoCancelado: turno,
                    turnoAsignado
                };

            }
        );


        // 4. La transacción ya fue confirmada.
        // Ahora notificamos a los recepcionistas.
        if (
            resultado.turnoAsignado !== null &&
            resultado.turnoAsignado.id !== null
        ) {

            this.notificacionService.notificarTurnoAsignado({

                idTurno: resultado.turnoAsignado.id,

                idPaciente: resultado.turnoAsignado.idPaciente,

                idMedico: resultado.turnoAsignado.idMedico,

                fechaHoraInicio:
                    resultado.turnoAsignado.fechaHoraInicio.toISOString(),

                fechaHoraFin:
                    resultado.turnoAsignado.fechaHoraFin.toISOString()

            });

        }


        return resultado;

    }


    // Convertir una fecha a formato YYYY-MM-DD
    private formatearFecha(fecha: Date): string {

        const anio = fecha.getFullYear();

        const mes = String(
            fecha.getMonth() + 1
        ).padStart(2, "0");

        const dia = String(
            fecha.getDate()
        ).padStart(2, "0");

        return `${anio}-${mes}-${dia}`;

    }

}
