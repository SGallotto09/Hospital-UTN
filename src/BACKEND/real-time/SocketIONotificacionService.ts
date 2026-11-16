
import type { INotificacionService } from "../modules/admicion-turnos/application/ports/INotificacionService.js";

import type { AdmissionSocketServer } from "./SocketServer.js";

export class SocketIONotificacionService implements INotificacionService {

    constructor(
        private readonly io: AdmissionSocketServer
    ) {}

    // Avisar a los recepcionistas que se asignó un turno
    notificarTurnoAsignado(
        datos: Parameters<INotificacionService["notificarTurnoAsignado"]>[0]
    ): void {

        this.io
            .to("rol:recepcionista")
            .emit("admision:turno-asignado", datos);

    }

    // Avisar al consultorio que un paciente está en sala de espera
    notificarPacienteEnSalaDeEspera(
        datos: Parameters<INotificacionService["notificarPacienteEnSalaDeEspera"]>[0]
    ): void {

        this.io
            .to(`consultorio:${datos.idMedico}`)
            .emit("consultorio:paciente-en-sala-espera", datos);

    }

    // Avisar a los médicos de guardia sobre una urgencia vital
    notificarUrgenciaVital(
        datos: Parameters<INotificacionService["notificarUrgenciaVital"]>[0]
    ): void {

        this.io
            .to("medicos:guardia-disponibles")
            .emit("triaje:riesgo-vital", datos);

    }

}
