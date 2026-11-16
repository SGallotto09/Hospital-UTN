
import express from "express";
import { UsuarioMySQLRepository } from "./modules/IAM/infraestructure/repositories/UsuarioMySQLRepository.js";
import { BcryptVerificadorContrasenia } from "./modules/IAM/infraestructure/repositories/BcryptVerificadorContrasenia.js";
import { BcryptHasheadorContrasenia } from "./modules/IAM/infraestructure/repositories/BcryptHasheadorContrasenia.js";
import { IniciarSesion } from "./modules/IAM/use-cases/IniciarSesion.js";
import { RegistrarUsuario } from "./modules/IAM/use-cases/RegistrarUsuario.js";
import { AuthController } from "./modules/IAM/infraestructure/api/AuthController.js";
import { AuthRoutes } from "./modules/IAM/infraestructure/api/AuthRoutes.js";
import { RegistroController } from "./modules/IAM/infraestructure/api/RegistroController.js";
import { RegistroRoutes } from "./modules/IAM/infraestructure/api/RegistroRoutes.js";
import { Database } from "./database/connectionDB.js";
import session from "express-session";
import "dotenv/config";

const app = express();

app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 1000 * 60 * 60
    }
}));

const PORT = 3000;

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

const database = Database.getInstance();

database.probarConexion();

app.listen(PORT, () => {
    console.log(`Servidor backend funcionando en http://localhost:${PORT}`);
});
