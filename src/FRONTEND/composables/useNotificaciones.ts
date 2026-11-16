
import { io, type Socket } from "socket.io-client";

import {
    onMounted,
    onUnmounted,
    ref
} from "vue";


// Datos recibidos desde el backend

interface TurnoAsignadoPayload {

    idTurno: number;
    idPaciente: number;
    idMedico: number;
    fechaHoraInicio: string;
    fechaHoraFin: string;

}


interface PacienteEnSalaEsperaPayload {

    idTurno: number;
    idPaciente: number;
    idMedico: number;

}


interface UrgenciaVitalPayload {

    idTriaje: number;
    idPaciente: number;
    idEnfermero: number;
    nivelUrgencia: "ROJO";
    fechaHoraIngreso: string;

}


// Eventos enviados por el servidor
interface ServerToClientEvents {

    "admision:turno-asignado": (
        datos: TurnoAsignadoPayload
    ) => void;

    "consultorio:paciente-en-sala-espera": (
        datos: PacienteEnSalaEsperaPayload
    ) => void;

    "triaje:riesgo-vital": (
        datos: UrgenciaVitalPayload
    ) => void;

}


// Eventos enviados por el cliente
interface ClientToServerEvents {}


// Composable para administrar las notificaciones
export function useNotificaciones(
    token: string,
    urlServidor = "http://localhost:3000"
) {

    // Estado de conexión
    const conectado = ref(false);


    // Notificaciones recibidas
    const turnosAsignados = ref<TurnoAsignadoPayload[]>([]);

    const pacientesEnSalaEspera =
        ref<PacienteEnSalaEsperaPayload[]>([]);

    const urgenciasVitales = ref<UrgenciaVitalPayload[]>([]);


    // Crear conexión Socket.IO
    // Los tipos se definen en Socket, no en io()
    const socket: Socket<
        ServerToClientEvents,
        ClientToServerEvents
    > = io(urlServidor, {

        autoConnect: false,

        auth: {
            token
        },

        withCredentials: true

    });


    // Evento: conexión establecida
    const alConectar = () => {

        conectado.value = true;

        console.log(
            "Conectado al servidor de notificaciones."
        );

    };


    // Evento: desconexión
    const alDesconectar = () => {

        conectado.value = false;

    };


    // Evento: turno asignado desde lista de espera
    const alRecibirTurnoAsignado = (
        datos: TurnoAsignadoPayload
    ) => {

        turnosAsignados.value.unshift(datos);

        console.log(
            "Nuevo turno asignado desde lista de espera:",
            datos
        );

    };


    // Evento: paciente en sala de espera
    const alRecibirPacienteEnSala = (
        datos: PacienteEnSalaEsperaPayload
    ) => {

        pacientesEnSalaEspera.value.unshift(datos);

        console.log(
            "Nuevo paciente en sala de espera:",
            datos
        );

    };


    // Evento: urgencia vital
    const alRecibirUrgenciaVital = (
        datos: UrgenciaVitalPayload
    ) => {

        urgenciasVitales.value.unshift(datos);

        console.log(
            "ALERTA: PACIENTE CON RIESGO VITAL",
            datos
        );

    };


    // Error de conexión o autenticación
    const alErrorConexion = (error: Error) => {

        console.error(
            "Error en Socket.IO:",
            error.message
        );

    };


    // Registrar eventos
    socket.on("connect", alConectar);

    socket.on("disconnect", alDesconectar);

    socket.on(
        "admision:turno-asignado",
        alRecibirTurnoAsignado
    );

    socket.on(
        "consultorio:paciente-en-sala-espera",
        alRecibirPacienteEnSala
    );

    socket.on(
        "triaje:riesgo-vital",
        alRecibirUrgenciaVital
    );

    socket.on("connect_error", alErrorConexion);


    // Conectar al montar el componente
    onMounted(() => {

        socket.connect();

    });


    // Desconectar al desmontar el componente
    onUnmounted(() => {

        socket.disconnect();

    });


    return {

        conectado,

        turnosAsignados,

        pacientesEnSalaEspera,

        urgenciasVitales

    };

}
