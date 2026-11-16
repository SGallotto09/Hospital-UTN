
import type {
    NotificacionTurnoAsignado,
    NotificacionPacienteEnSalaEspera,
    NotificacionUrgenciaVital
} from "../modules/admicion-turnos/application/ports/INotificacionService.js";


// Eventos que el servidor envía al cliente
export interface ServerToClientEvents {

    "admision:turno-asignado": (
        datos: NotificacionTurnoAsignado
    ) => void;


    "consultorio:paciente-en-sala-espera": (
        datos: NotificacionPacienteEnSalaEspera
    ) => void;


    "triaje:riesgo-vital": (
        datos: NotificacionUrgenciaVital
    ) => void;

}


// Eventos que el cliente puede enviar al servidor
export interface ClientToServerEvents {}


// Comunicación entre servidores
export interface InterServerEvents {}


// Información del usuario autenticado
export interface UsuarioSocketAutenticado {

    id: number;

    rol: string;

    // Este valor debe calcularlo el backend,
    // según la disponibilidad real del médico de guardia.
    disponibleParaGuardia?: boolean;

}


// Datos asociados a cada conexión
export interface SocketData {

    usuario: UsuarioSocketAutenticado;

}
