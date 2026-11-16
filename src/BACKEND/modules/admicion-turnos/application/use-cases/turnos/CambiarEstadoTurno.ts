
import type {
    EstadoTurnoNombre
} from "../../../domain/states/turno/EstadoTurno.js";

import type {
    ITurnoRepository
} from "../../../domain/repositories/ITurnoRepository.js";

import type {
    INotificacionService
} from "../../ports/INotificacionService.js";


export interface CambiarEstadoTurnoDTO {

    idTurno: number;

    nuevoEstado: EstadoTurnoNombre;

}


export class CambiarEstadoTurno {

    constructor(
        private readonly turnoRepository: ITurnoRepository,
        private readonly notificacionService: INotificacionService
    ) {}


    async ejecutar(
        datos: CambiarEstadoTurnoDTO
    ): Promise<void> {

        // 1. Validar el identificador
        if (
            !Number.isSafeInteger(datos.idTurno) ||
            datos.idTurno <= 0
        ) {
            throw new Error(
                "El identificador del turno no es válido."
            );
        }


        // 2. La cancelación se gestiona mediante otro caso de uso
        if (datos.nuevoEstado === "Cancelado") {

            throw new Error(
                "Utilice CancelarTurno para cancelar una cita."
            );

        }


        // 3. Buscar el turno
        const turno = await this.turnoRepository.buscarPorId(
            datos.idTurno
        );

        if (!turno) {

            throw new Error(
                "No se encontró el turno solicitado."
            );

        }


        // 4. Intentar realizar la transición
        // El patrón State verifica si está permitida
        turno.cambiarEstado(datos.nuevoEstado);


        // 5. Persistir los cambios
        await this.turnoRepository.actualizar(turno);


        // 6. Notificar al consultorio
        // cuando el paciente ingresa a sala de espera
        if (datos.nuevoEstado === "En Sala de Espera") {

            if (turno.id === null) {

                throw new Error(
                    "No se puede notificar un turno sin identificador."
                );

            }

            this.notificacionService
                .notificarPacienteEnSalaDeEspera({

                    idTurno: turno.id,

                    idPaciente: turno.idPaciente,

                    idMedico: turno.idMedico

                });

        }

    }

}
