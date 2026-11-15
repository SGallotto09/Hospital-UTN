
import { PacienteRepositoryMySQL } from '../repositories/paciente_repository_mysql.js';

import { ObtenerPacientes } from '../../use-cases/obtener_pacientes.js';
import { ObtenerPacientePorId } from '../../use-cases/obtener_paciente_por_id.js';
import { ObtenerPacientePorDni } from '../../use-cases/obtener_paciente_por_dni.js';

import { PacienteController } from './paciente_controller.js';


const repositorio = new PacienteRepositoryMySQL();


const obtenerPacientes = new ObtenerPacientes(repositorio);
const obtenerPacientePorId = new ObtenerPacientePorId(repositorio);
const obtenerPacientePorDni = new ObtenerPacientePorDni(repositorio);


export const pacienteController = new PacienteController(
    obtenerPacientes,
    obtenerPacientePorId,
    obtenerPacientePorDni
);
