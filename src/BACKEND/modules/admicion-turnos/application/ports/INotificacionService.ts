
export interface NotificacionTurnoAsignado {

    idTurno: number;
    idPaciente: number;
    idMedico: number;

    fechaHoraInicio: string;
    fechaHoraFin: string;

}


export interface NotificacionPacienteEnSalaEspera {

    idTurno: number;
    idPaciente: number;
    idMedico: number;

}


export interface NotificacionUrgenciaVital {

    idTriaje: number;
    idPaciente: number;
    idEnfermero: number;

    nivelUrgencia: "ROJO";

    fechaHoraIngreso: string;

}


export interface INotificacionService {

    // Notificar a los recepcionistas
    // cuando un paciente recibe un turno desde la lista de espera
    notificarTurnoAsignado(
        datos: NotificacionTurnoAsignado
    ): void;


    // Notificar al consultorio médico
    // cuando un paciente llega a sala de espera
    notificarPacienteEnSalaDeEspera(
        datos: NotificacionPacienteEnSalaEspera
    ): void;


    // Notificar a los médicos de guardia disponibles
    // cuando ingresa un paciente con riesgo vital
    notificarUrgenciaVital(
        datos: NotificacionUrgenciaVital
    ): void;

}
