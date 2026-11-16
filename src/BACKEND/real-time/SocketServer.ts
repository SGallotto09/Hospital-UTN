
import { Server } from "socket.io";

import type {
    Server as HttpServer
} from "node:http";

import type {
    ServerToClientEvents,
    ClientToServerEvents,
    InterServerEvents,
    SocketData,
    UsuarioSocketAutenticado
} from "./SocketTypes.js";


export type AutenticarSocket = (
    token: string
) => Promise<UsuarioSocketAutenticado | null>;


export type AdmissionSocketServer = Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
>;


export function configurarSocketIO(
    httpServer: HttpServer,
    autenticarSocket: AutenticarSocket
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


    // 1. Autenticar cada conexión
    io.use((socket, next) => {

        const token = socket.handshake.auth?.token;

        if (typeof token !== "string" || token.length === 0) {

            return next(
                new Error("No se proporcionó un token de autenticación.")
            );

        }


        void autenticarSocket(token)

            .then(usuario => {

                if (
                    !usuario ||
                    !Number.isSafeInteger(usuario.id) ||
                    usuario.id <= 0
                ) {

                    return next(
                        new Error("El usuario no está autorizado.")
                    );

                }


                // Guardar la información verificada
                // por el backend
                socket.data.usuario = {

                    ...usuario,

                    rol: usuario.rol.trim().toLowerCase()

                };


                next();

            })

            .catch(() => {

                next(
                    new Error("No se pudo validar la autenticación.")
                );

            });

    });


    // 2. Asignar a cada usuario sus salas correspondientes
    io.on("connection", socket => {

        const usuario = socket.data.usuario;

        console.log(
            `Usuario ${usuario.id} conectado mediante Socket.IO`
        );


        // Sala individual del usuario
        socket.join(`usuario:${usuario.id}`);


        // Recepcionistas
        if (usuario.rol === "recepcionista") {

            socket.join("rol:recepcionista");

        }


        // Médicos
        if (usuario.rol === "medico") {

            // Consultorio correspondiente al médico
            socket.join(`consultorio:${usuario.id}`);


            // Solamente médicos disponibles para guardia
            // reciben alertas de riesgo vital
            if (usuario.disponibleParaGuardia === true) {

                socket.join("medicos:guardia-disponibles");

            }

        }


        socket.on("disconnect", () => {

            console.log(
                `Usuario ${usuario.id} desconectado`
            );

        });

    });


    return io;

}
