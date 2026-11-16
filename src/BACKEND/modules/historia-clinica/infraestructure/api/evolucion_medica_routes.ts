import { Router } from 'express';
import { evolucionMedicaController } from './evolucion_medica_dependencies.js';

const router: Router = Router();
router.post('/', (req, res) => evolucionMedicaController.registrar(req, res));
router.get('/paciente/:idPaciente', (req, res) => evolucionMedicaController.obtenerPorPaciente(req, res));
export default router;
