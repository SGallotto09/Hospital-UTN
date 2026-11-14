import { Router } from 'express';
import { signoVitalController } from './signo_vital_dependencies.js';

const router: Router = Router();

router.post('/', (req, res) =>
    signoVitalController.registrar(req, res)
);

router.get('/', (req, res) =>
    signoVitalController.obtenerTodos(req, res)
);

router.get('/paciente/:idPaciente', (req, res) =>
    signoVitalController.obtenerPorPaciente(req, res)
);

export default router;