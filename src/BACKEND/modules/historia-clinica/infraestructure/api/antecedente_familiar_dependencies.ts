import { AntecedenteFamiliarRepositoryMySQL } from '../repositories/antecedente_familiar_repository_mysql.js';
import { RegistrarAntecedenteFamiliar } from '../../use-cases/registrar_antecedente_familiar.js';
import { ObtenerAntecedentesPorPaciente } from '../../use-cases/obtener_antecedentes_por_paciente.js';
import { AntecedenteFamiliarController } from './antecedente_familiar_controller.js';

const repositorio = new AntecedenteFamiliarRepositoryMySQL();
export const antecedenteFamiliarController = new AntecedenteFamiliarController(
    new RegistrarAntecedenteFamiliar(repositorio),
    new ObtenerAntecedentesPorPaciente(repositorio)
);
