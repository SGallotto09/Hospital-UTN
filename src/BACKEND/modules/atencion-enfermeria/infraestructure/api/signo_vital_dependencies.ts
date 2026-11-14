
import { SignoVitalRepositoryMySQL } from '../repositories/signo_vital_repository_mysql.js';

import { RegistrarSignoVital } from '../../use-cases/registrar_signo_vital.js';
import { ObtenerSignosVitales } from '../../use-cases/obtener_signos_vitales.js';
import { ObtenerSingosVitalesPorPacientes } from '../../use-cases/obetener_signos_vitales_por_pacientes.js';

import { SignoVitalController } from './signo_vital_controller.js';

const repositorio = new SignoVitalRepositoryMySQL();

const registrarSignoVital = new RegistrarSignoVital(repositorio);
const obtenerSignoVital = new ObtenerSignosVitales(repositorio);
const obtenerSingoVitalPorPaciente = new ObtenerSingosVitalesPorPacientes(repositorio);

export const signoVitalController = new SignoVitalController(
    registrarSignoVital,
    obtenerSignoVital,
    obtenerSingoVitalPorPaciente
);
