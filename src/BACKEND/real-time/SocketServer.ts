
import { Server } from "socket.io";

import type {
    Server as HttpServer,
    IncomingMessage
} from "node:http";

import type {
    RequestHandler
} from "express";

import type {
    ServerToClientEvents,
    ClientToServerEvents,
    InterServerEvents,
    SocketData
} from "./SocketTypes.js";


export type AdmissionSocketServer = Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
>;

// Información de la sesión que compartimos con Socket.IO.
type SolicitudConSesion = IncomingMessage & {
    session?: {
        usuarioId?: number;
        rol?: string;
    };
};


export function configurarSocketIO(
    httpServer: HttpServer,
    sessionMiddleware: RequestHandler
): AdmissionSocketServer {

    const io = new Server<
        ClientToServerEvents,
        ServerToClientEvents,
        InterServerEvents,
        SocketData
    >(httpServer, {

        cors: {
            origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
            methods: ["GET", "POST"],
            credentials: true
        }

    });


    // 1. Compartir la sesión de Express con Socket.IO.
    // Se utiliza exactamente el mismo middleware
    // que utiliza el servidor HTTP.
    io.engine.use(
        sessionMiddleware as unknown as Parameters<typeof io.engine.use>[0]
    );


    // 2. Comprobar que el usuario tenga una sesión válida.
    io.use((socket, next) => {

        const solicitud = socket.request as SolicitudConSesion;

        const sesion = solicitud.session;

        const usuarioId = sesion?.usuarioId;

        const rol = sesion?.rol;


        if (
            typeof usuarioId !== "number" ||
            !Number.isSafeInteger(usuarioId) ||
            usuarioId <= 0 ||
            typeof rol !== "string" ||
            rol.trim().length === 0
        ) {

            return next(
                new Error("Debes iniciar sesión para conectarte.")
            );

        }


        // Guardar solamente información obtenida
        // de la sesión validada por el backend.
        socket.data.usuario = {

            id: usuarioId,

            rol: rol.trim().toLowerCase()

        };


        next();

    });


    // 3. Asignar los usuarios a sus salas.
    io.on("connection", socket => {

        const usuario = socket.data.usuario;

        console.log(
            `Usuario ${usuario.id} conectado mediante Socket.IO`
        );


        // Sala individual del usuario.
        socket.join(`usuario:${usuario.id}`);


        // Sala de recepcionistas.
        if (usuario.rol === "recepcionista") {

            socket.join("rol:recepcionista");

        }


        // Sala del consultorio médico.
        if (usuario.rol === "medico") {

            socket.join(`consultorio:${usuario.id}`);

        }


        socket.on("disconnect", () => {

            console.log(
                `Usuario ${usuario.id} desconectado de Socket.IO`
            );

        });

    });


    return io;

}
