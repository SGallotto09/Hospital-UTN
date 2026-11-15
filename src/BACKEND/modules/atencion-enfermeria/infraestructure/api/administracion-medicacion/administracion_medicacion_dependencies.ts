import { AdministracionMedicacionRepositoryMysq } from '../../repositories/administracion_medicacion_repository_mysql.js';
import { ObtenerMedicaciones } from '../../../use-cases/administracion-medicacion/obtener_medicaciones.js';
import { AdministracionMedicacionController } from './administracion_medicacion_controller.js';

const administracionMedicacionRepository = new AdministracionMedicacionRepositoryMysq();

const obtenerMedicaciones = new ObtenerMedicaciones(administracionMedicacionRepository);

export const administracionMedicacionController = new AdministracionMedicacionController(obtenerMedicaciones);