
import express, { type ErrorRequestHandler } from "express";
import { createServer } from "node:http";
import session from "express-session";
import "dotenv/config";

// ==========================================
// IAM
// ==========================================

import { UsuarioMySQLRepository } from "./modules/IAM/infraestructure/repositories/UsuarioMySQLRepository.js";
import { BcryptVerificadorContrasenia } from "./modules/IAM/infraestructure/repositories/BcryptVerificadorContrasenia.js";
import { BcryptHasheadorContrasenia } from "./modules/IAM/infraestructure/repositories/BcryptHasheadorContrasenia.js";

import { IniciarSesion } from "./modules/IAM/use-cases/IniciarSesion.js";
import { RegistrarUsuario } from "./modules/IAM/use-cases/RegistrarUsuario.js";

import { AuthController } from "./modules/IAM/infraestructure/api/AuthController.js";
import { AuthRoutes } from "./modules/IAM/infraestructure/api/AuthRoutes.js";
import { RegistroController } from "./modules/IAM/infraestructure/api/RegistroController.js";
import { RegistroRoutes } from "./modules/IAM/infraestructure/api/RegistroRoutes.js";

// ==========================================
// INFRAESTRUCTURA
// ==========================================

import { Database } from "./database/connectionDB.js";

import { configurarSocketIO } from "./real-time/SocketServer.js";
import { SocketIONotificacionService } from "./real-time/SocketIONotificacionService.js";

// ==========================================
// ADMISIONES - PACIENTES
// ==========================================

import { MySQLPacienteRepository } from "./modules/admicion-turnos/infraestructure/repositories/MySQLPacienteRepository.js";

import { RegistrarPaciente } from "./modules/admicion-turnos/application/use-cases/admision/RegistrarPaciente.js";
import { ListarPacientes } from "./modules/admicion-turnos/application/use-cases/pacientes/ListarPacientes.js";

import { PacienteController } from "./modules/admicion-turnos/infraestructure/api/PacienteController.js";
import { PacienteRoutes } from "./modules/admicion-turnos/infraestructure/api/PacienteRoutes.js";

// ==========================================
// ADMISIONES - OBRAS SOCIALES
// ==========================================

import { MySQLObraSocialRepository } from "./modules/admicion-turnos/infraestructure/repositories/MySQLObraSocialRepository.js";

import { ListarObrasSociales } from "./modules/admicion-turnos/application/use-cases/obras-sociales/ListarObrasSociales.js";

import { ObraSocialController } from "./modules/admicion-turnos/infraestructure/api/ObraSocialController.js";
import { ObraSocialRoutes } from "./modules/admicion-turnos/infraestructure/api/ObraSocialRoutes.js";

// ==========================================
// ADMISIONES - TURNOS
// ==========================================

import { MySQLTurnoRepository } from "./modules/admicion-turnos/infraestructure/repositories/MySQLTurnoRepository.js";

import { MySQLAdmisionUnitOfWork } from "./modules/admicion-turnos/infraestructure/unit-of-work/MySQLAdmisionUnitOfWork.js";

import { ConsultarAgendaMedica } from "./modules/admicion-turnos/application/use-cases/agenda/ConsultarAgendaMedica.js";
import { ReservarTurno } from "./modules/admicion-turnos/application/use-cases/turnos/ReservarTurno.js";
import { CancelarTurno } from "./modules/admicion-turnos/application/use-cases/turnos/CancelarTurno.js";
import { CambiarEstadoTurno } from "./modules/admicion-turnos/application/use-cases/turnos/CambiarEstadoTurno.js";
import { InsertarEntreturno } from "./modules/admicion-turnos/application/use-cases/turnos/InsertarEntreTurno.js";

import { TurnoController } from "./modules/admicion-turnos/infraestructure/api/TurnoController.js";
import { TurnoRoutes } from "./modules/admicion-turnos/infraestructure/api/TurnosRoutes.js";

// ==========================================
// ADMISIONES - TRIAJE
// ==========================================

import { MySQLTriajeRepository } from "./modules/admicion-turnos/infraestructure/repositories/MySQLTriajeRepository.js";

import { RegistrarTriaje } from "./modules/admicion-turnos/application/use-cases/triaje/RegistrarTriaje.js";

import { TriajeController } from "./modules/admicion-turnos/infraestructure/api/TriajeController.js";
import { TriajeRoutes } from "./modules/admicion-turnos/infraestructure/api/TriajeRoutes.js";

// ==========================================
// FACTURACIÓN Y ADMINISTRACIÓN
// ==========================================

import { CuentaFacturacionMySQLRepository } from "./modules/facturacion-administracion/infraestructure/CuentaFacturacionMySQLRepository.js";

import { CrearCuentaFacturacion } from "./modules/facturacion-administracion/use-cases/CrearCuentaFacturacion.js";

import { FacturacionController } from "./modules/facturacion-administracion/infraestructure/api/FacturacionController.js";

import { FacturacionRoutes } from "./modules/facturacion-administracion/infraestructure/api/FacturacionRoutes.js";

import { CargoFacturacionMySQLRepository } from "./modules/facturacion-administracion/infraestructure/CargoFacturacionMySQLRepository.js";

import { RegistrarCargoFacturacion } from "./modules/facturacion-administracion/use-cases/RegistrarCargoFacturacion.js";

import { FacturarPrestacion } from "./modules/facturacion-administracion/use-cases/FacturarPrestacion.js";

import { RegistroPrestacionMySQLRepository } from "./modules/facturacion-administracion/infraestructure/RegistroPrestacionMySQLRepository.js";

import { iniciarFacturacionMedicacion } from "./modules/facturacion-administracion/infraestructure/IniciarFacturacionMedicacion.js";

// ==========================================
// CONFIGURACIÓN GENERAL
// ==========================================

for (const nombre of ["SESSION_SECRET", "DB_HOST", "DB_USER", "DB_NAME"]) {
    if (!process.env[nombre]?.trim()) {
        throw new Error(`Falta configurar ${nombre}`);
    }
}

if (process.env.DB_PASSWORD === undefined) {
    throw new Error("Falta configurar DB_PASSWORD");
}

const PORT = Number(process.env.PORT ?? 3000);

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
    throw new Error("PORT inválido");
}

const app = express();

app.use(express.json());

// ==========================================
// SESIONES
// ==========================================

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

// ==========================================
// BASE DE DATOS
// ==========================================

const database = Database.getInstance();

if (!await database.probarConexion()) {
    await database.cerrar();

    throw new Error(
        "No se pudo iniciar el servidor: MySQL no está disponible"
    );
}

// ==========================================
// SERVIDOR HTTP Y SOCKET.IO
// ==========================================

const servidor = createServer(app);

const io = configurarSocketIO(
    servidor,
    sessionMiddleware
);

const notificacionService = new SocketIONotificacionService(io);

// ==========================================
// MÓDULO IAM
// ==========================================

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

// ==========================================
// FACTURACIÓN Y ADMINISTRACIÓN
// ==========================================

const cuentaFacturacionRepository =
    new CuentaFacturacionMySQLRepository();

const crearCuentaFacturacion =
    new CrearCuentaFacturacion(cuentaFacturacionRepository);

const cargoFacturacionRepository =
    new CargoFacturacionMySQLRepository();

const registrarCargoFacturacion =
    new RegistrarCargoFacturacion(cargoFacturacionRepository);

const registroPrestacionRepository =
    new RegistroPrestacionMySQLRepository();

const facturarPrestacion =
    new FacturarPrestacion(registroPrestacionRepository);

const facturacionController = new FacturacionController(
    crearCuentaFacturacion,
    cuentaFacturacionRepository,
    registrarCargoFacturacion,
    facturarPrestacion
);

const facturacionRoutes = new FacturacionRoutes(
    facturacionController
);

app.use(
    "/api/facturacion",
    facturacionRoutes.obtenerRouter()
);

// ==========================================
// MÓDULO DE PACIENTES
// ==========================================

const pacienteRepository = new MySQLPacienteRepository();

const registrarPaciente = new RegistrarPaciente(
    pacienteRepository
);

const listarPacientes = new ListarPacientes(
    pacienteRepository
);

const pacienteController = new PacienteController(
    registrarPaciente,
    listarPacientes
);

const pacienteRoutes = new PacienteRoutes(
    pacienteController
);

app.use(
    "/api/admisiones/pacientes",
    pacienteRoutes.obtenerRouter()
);

// ==========================================
// MÓDULO DE TURNOS
// ==========================================

const turnoRepository = new MySQLTurnoRepository();

const unitOfWork = new MySQLAdmisionUnitOfWork();

const consultarAgenda = new ConsultarAgendaMedica(
    turnoRepository
);

const reservarTurno = new ReservarTurno(
    turnoRepository,
    pacienteRepository
);

const cancelarTurno = new CancelarTurno(
    unitOfWork,
    notificacionService
);

const cambiarEstadoTurno = new CambiarEstadoTurno(
    turnoRepository,
    notificacionService
);

const insertarEntreturno = new InsertarEntreturno(
    turnoRepository,
    pacienteRepository
);

const turnoController = new TurnoController(
    consultarAgenda,
    reservarTurno,
    cancelarTurno,
    cambiarEstadoTurno,
    insertarEntreturno
);

const turnoRoutes = new TurnoRoutes(
    turnoController
);

app.use(
    "/api/admisiones/turnos",
    turnoRoutes.obtenerRouter()
);

// ==========================================
// MÓDULO DE OBRAS SOCIALES
// ==========================================

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

app.use(
    "/api/admisiones/obras-sociales",
    obraSocialRoutes.obtenerRouter()
);

// ==========================================
// MÓDULO DE TRIAJE
// ==========================================

const triajeRepository = new MySQLTriajeRepository();

const registrarTriaje = new RegistrarTriaje(
    triajeRepository,
    pacienteRepository,
    notificacionService
);

const triajeController = new TriajeController(
    registrarTriaje
);

const triajeRoutes = new TriajeRoutes(
    triajeController
);

app.use(
    "/api/admisiones/triaje",
    triajeRoutes.obtenerRouter()
);

// ==========================================
// INICIALIZACIÓN DE FACTURACIÓN
// ==========================================

iniciarFacturacionMedicacion();

// ==========================================
// RUTA 404
// ==========================================

app.use((_req, res) => {
    res.status(404).json({
        mensaje: "Ruta no encontrada"
    });
});

// ==========================================
// MANEJO DE ERRORES
// ==========================================

const manejarError: ErrorRequestHandler = (
    error: unknown,
    _req,
    res,
    next
) => {
    if (res.headersSent) {
        next(error);
        return;
    }

    if (
        error instanceof SyntaxError &&
        "type" in error &&
        error.type === "entity.parse.failed"
    ) {
        res.status(400).json({
            mensaje: "El cuerpo debe contener JSON válido"
        });
        return;
    }

    if (
        error &&
        typeof error === "object" &&
        "type" in error &&
        error.type === "entity.too.large"
    ) {
        res.status(413).json({
            mensaje: "El cuerpo de la solicitud es demasiado grande"
        });
        return;
    }

    console.error("Error al procesar la solicitud", error);

    res.status(500).json({
        mensaje: "Error interno del servidor"
    });
};

app.use(manejarError);

// ==========================================
// INICIO DEL SERVIDOR
// ==========================================

servidor.on("error", (error) => {
    console.error("No se pudo iniciar el servidor HTTP", error);

    process.exitCode = 1;

    void database.cerrar().catch((errorCierre: unknown) => {
        console.error("No se pudo cerrar MySQL", errorCierre);
    });
});

servidor.listen(PORT, () => {
    console.log(
        `Servidor backend funcionando en http://localhost:${PORT}`
    );

    console.log("Socket.IO inicializado correctamente");
});

// ==========================================
// CIERRE DEL SERVIDOR
// ==========================================

let cerrando = false;

function cerrarServidor() {
    if (cerrando) return;

    cerrando = true;

    io.close(() => {
        void database.cerrar().catch((error: unknown) => {
            console.error("No se pudo cerrar MySQL", error);

            process.exitCode = 1;
        });
    });
}

process.once("SIGINT", cerrarServidor);
process.once("SIGTERM", cerrarServidor);
