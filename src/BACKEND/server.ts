
import express, { type ErrorRequestHandler } from "express";
import { UsuarioMySQLRepository } from "./modules/IAM/infraestructure/repositories/UsuarioMySQLRepository.js";
import { BcryptVerificadorContrasenia } from "./modules/IAM/infraestructure/repositories/BcryptVerificadorContrasenia.js";
import { BcryptHasheadorContrasenia } from "./modules/IAM/infraestructure/repositories/BcryptHasheadorContrasenia.js";
import { IniciarSesion } from "./modules/IAM/use-cases/IniciarSesion.js";
import { RegistrarUsuario } from "./modules/IAM/use-cases/RegistrarUsuario.js";
import { AuthController } from "./modules/IAM/infraestructure/api/AuthController.js";
import { AuthRoutes } from "./modules/IAM/infraestructure/api/AuthRoutes.js";
import { RegistroController } from "./modules/IAM/infraestructure/api/RegistroController.js";
import { RegistroRoutes } from "./modules/IAM/infraestructure/api/RegistroRoutes.js";
import { createServer } from "node:http";
import { configurarSocketIO } from "./real-time/SocketServer.js";
import { MySQLPacienteRepository } from "./modules/admicion-turnos/infraestructure/repositories/MySQLPacienteRepository.js";
import { RegistrarPaciente } from "./modules/admicion-turnos/application/use-cases/admision/RegistrarPaciente.js";
import { ListarPacientes } from "./modules/admicion-turnos/application/use-cases/pacientes/ListarPacientes.js";
import { PacienteController } from "./modules/admicion-turnos/infraestructure/api/PacienteController.js";
import { PacienteRoutes } from "./modules/admicion-turnos/infraestructure/api/PacienteRoutes.js";
import { MySQLObraSocialRepository } from "./modules/admicion-turnos/infraestructure/repositories/MySQLObraSocialRepository.js";
import { ListarObrasSociales } from "./modules/admicion-turnos/application/use-cases/obras-sociales/ListarObrasSociales.js";
import { ObraSocialController } from "./modules/admicion-turnos/infraestructure/api/ObraSocialController.js";
import { ObraSocialRoutes } from "./modules/admicion-turnos/infraestructure/api/ObraSocialRoutes.js";

import { Database } from "./database/connectionDB.js";
import session from "express-session";
import "dotenv/config";

for (const nombre of ["SESSION_SECRET", "DB_HOST", "DB_USER", "DB_NAME"]) {
    if (!process.env[nombre]?.trim()) throw new Error(`Falta configurar ${nombre}`);
}
if (process.env.DB_PASSWORD === undefined) throw new Error("Falta configurar DB_PASSWORD");
const PORT = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error("PORT inválido");

const app = express();

app.use(express.json());

const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 1000 * 60 * 60
    }
});

app.use(sessionMiddleware);


const usuarioRepository = new UsuarioMySQLRepository();

const verificadorContrasenia = new BcryptVerificadorContrasenia();
const hasheadorContrasenia = new BcryptHasheadorContrasenia();

const iniciarSesion = new IniciarSesion(
    usuarioRepository,
    verificadorContrasenia
);

const registrarUsuario = new RegistrarUsuario(
    usuarioRepository,
    hasheadorContrasenia
);

const authController = new AuthController(iniciarSesion);
const registroController = new RegistroController(registrarUsuario);

const authRoutes = new AuthRoutes(authController);
const registroRoutes = new RegistroRoutes(registroController);

app.use("/api/auth", authRoutes.obtenerRouter());
app.use("/api/auth", registroRoutes.obtenerRouter());

const pacienteRepository = new MySQLPacienteRepository();

const registrarPaciente = new RegistrarPaciente(pacienteRepository);
const listarPacientes = new ListarPacientes(pacienteRepository);

const pacienteController = new PacienteController(registrarPaciente, listarPacientes);

const pacienteRoutes = new PacienteRoutes(pacienteController);

app.use("/api/admisiones/pacientes", pacienteRoutes.obtenerRouter());
const database = Database.getInstance();

const obraSocialRepository = new MySQLObraSocialRepository();

const listarObrasSociales = new ListarObrasSociales(
    obraSocialRepository
);

const obraSocialController = new ObraSocialController(
    listarObrasSociales
);

const obraSocialRoutes = new ObraSocialRoutes(
    obraSocialController
);

app.use("/api/admisiones/obras-sociales", obraSocialRoutes.obtenerRouter());

app.use((_req, res) => {
    res.status(404).json({ mensaje: "Ruta no encontrada" });
});
const manejarError: ErrorRequestHandler = (error: unknown, _req, res, next) => {
    if (res.headersSent) { next(error); return; }
    if (error instanceof SyntaxError && 'type' in error && error.type === 'entity.parse.failed') {
        res.status(400).json({ mensaje: "El cuerpo debe contener JSON válido" });
        return;
    }
    if (error && typeof error === 'object' && 'type' in error && error.type === 'entity.too.large') {
        res.status(413).json({ mensaje: "El cuerpo de la solicitud es demasiado grande" });
        return;
    }
    console.error("Error al procesar la solicitud", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
};
app.use(manejarError);


if (!await database.probarConexion()) {

    await database.cerrar();

    throw new Error(
        "No se pudo iniciar el servidor: MySQL no está disponible"
    );

}


// Crear servidor HTTP compartido.
const servidor = createServer(app);


// Inicializar Socket.IO reutilizando la sesión de Express.
const io = configurarSocketIO(
    servidor,
    sessionMiddleware
);


// Manejar errores del servidor.
servidor.on("error", (error) => {

    console.error("No se pudo iniciar el servidor HTTP", error);

    process.exitCode = 1;

    void database.cerrar().catch((errorCierre: unknown) => {

        console.error(
            "No se pudo cerrar MySQL",
            errorCierre
        );

    });

});


// Iniciar el servidor.
servidor.listen(PORT, () => {

    console.log(
        `Servidor backend funcionando en http://localhost:${PORT}`
    );

    console.log(
        "Socket.IO inicializado correctamente"
    );

});


// Cerrar correctamente los recursos.
let cerrando = false;

function cerrarServidor() {

    if (cerrando) return;

    cerrando = true;

    io.close(() => {

        void database.cerrar().catch((error: unknown) => {

            console.error(
                "No se pudo cerrar MySQL",
                error
            );

            process.exitCode = 1;

        });

    });

}

process.once("SIGINT", cerrarServidor);
process.once("SIGTERM", cerrarServidor);

