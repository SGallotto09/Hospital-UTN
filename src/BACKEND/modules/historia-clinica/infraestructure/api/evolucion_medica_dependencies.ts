import { EvolucionMedicaRepositoryMySQL } from '../repositories/evolucion_medica_repository_mysql.js';
import { RegistrarEvolucionMedica } from '../../use-cases/registrar_evolucion_medica.js';
import { ObtenerEvolucionesPorPaciente } from '../../use-cases/obtener_evoluciones_por_paciente.js';
import { EvolucionMedicaController } from './evolucion_medica_controller.js';

const repositorio = new EvolucionMedicaRepositoryMySQL();
export const evolucionMedicaController = new EvolucionMedicaController(
    new RegistrarEvolucionMedica(repositorio),
    new ObtenerEvolucionesPorPaciente(repositorio),
);
