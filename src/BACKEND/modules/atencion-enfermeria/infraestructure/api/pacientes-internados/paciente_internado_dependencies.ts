import { ObtenerPacientesInternados } from "../../../use-cases/pacientes-internados/obtener_pacientes_internados.js";
import { PacienteInternadoRepositoryMysql } from "../../repositories/paciente_internado_repository_mysql.js";
import { PacienteInternadoController } from "./paciente_internado_controller.js";

const pacienteInternadoRepository = new PacienteInternadoRepositoryMysql();

const obtenerPacientesInternados = new ObtenerPacientesInternados(pacienteInternadoRepository);

export const pacienteInternadoController = new PacienteInternadoController(obtenerPacientesInternados);