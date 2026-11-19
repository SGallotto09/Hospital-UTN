import { AlergiaRepositoryMySQL } from '../repositories/alergia_repository_mysql.js';

import { RegistrarAlergia } from '../../use-cases/registrar_alergia.js';
import { ObtenerAlergiasPorPaciente } from '../../use-cases/obtener_alergias_por_paciente.js';

import { AlergiaController } from './alergia_controller.js';

const repositorio = new AlergiaRepositoryMySQL();

const registrarAlergia = new RegistrarAlergia(repositorio);
const obtenerAlergias = new ObtenerAlergiasPorPaciente(repositorio);

export const alergiaController = new AlergiaController(registrarAlergia, obtenerAlergias);
