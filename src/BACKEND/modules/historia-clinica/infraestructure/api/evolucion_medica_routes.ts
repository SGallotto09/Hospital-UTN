import { verificarRol } from '../../../IAM/infraestructure/middlewares/verificarRol.js';
import { Router } from 'express';
import { evolucionMedicaController } from './evolucion_medica_dependencies.js';

const router: Router = Router();
router.post('/', verificarRol(['Médico']), (req, res) =>
    evolucionMedicaController.registrar(req, res),
);
router.get('/paciente/:idPaciente', (req, res) =>
    evolucionMedicaController.obtenerPorPaciente(req, res),
);
export default router;
