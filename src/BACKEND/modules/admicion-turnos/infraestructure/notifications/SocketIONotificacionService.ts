
import type {
    INotificacionService,
    NotificacionTurnoAsignado,
    NotificacionPacienteEnSalaEspera,
    NotificacionUrgenciaVital
} from "../../application/ports/INotificacionService.js";

import type {
    AdmissionSocketServer
} from "../../../../real-time/SocketServer.js";


export class SocketIONotificacionService implements INotificacionService {

    constructor(
        private readonly io: AdmissionSocketServer
    ) {}


    // Notificar a los recepcionistas que se asignó un turno
    notificarTurnoAsignado(
        datos: NotificacionTurnoAsignado
    ): void {

        this.io
            .to("rol:recepcionista")
            .emit("admision:turno-asignado", datos);

    }


    // Notificar al consultorio que un paciente llegó
    notificarPacienteEnSalaDeEspera(
        datos: NotificacionPacienteEnSalaEspera
    ): void {

        this.io
            .to(`consultorio:${datos.idMedico}`)
            .emit("consultorio:paciente-en-sala-espera", datos);

    }


    // Alertar a los médicos de guardia disponibles
    notificarUrgenciaVital(
        datos: NotificacionUrgenciaVital
    ): void {

        this.io
            .to("medicos:guardia-disponibles")
            .emit("triaje:riesgo-vital", datos);

    }

}
