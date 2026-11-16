import { PacienteRepositoryMySQL } from '../repositories/paciente_repository_mysql.js';
import { AlergiaRepositoryMySQL } from '../repositories/alergia_repository_mysql.js';
import { AntecedenteFamiliarRepositoryMySQL } from '../repositories/antecedente_familiar_repository_mysql.js';
import { EvolucionMedicaRepositoryMySQL } from '../repositories/evolucion_medica_repository_mysql.js';
import { EstudioClinicoRepositoryMySQL } from '../repositories/estudio_clinico_repository_mysql.js';
import { ObtenerHistoriaClinicaCompleta } from '../../use-cases/obtener_historia_clinica_completa.js';
import { ObtenerEstudiosPorPaciente } from '../../use-cases/obtener_estudios_por_paciente.js';
import { HistoriaCompletaController } from './historia_completa_controller.js';

const estudios = new EstudioClinicoRepositoryMySQL();

export const historiaCompletaController = new HistoriaCompletaController(
    new ObtenerHistoriaClinicaCompleta(
        new PacienteRepositoryMySQL(),
        new AlergiaRepositoryMySQL(),
        new AntecedenteFamiliarRepositoryMySQL(),
        new EvolucionMedicaRepositoryMySQL(),
        estudios
    ),
    new ObtenerEstudiosPorPaciente(estudios)
);
