import { Router } from 'express';
import { historiaCompletaController } from './historia_completa_dependencies.js';

const router: Router = Router();

router.get('/paciente/:idPaciente', (req, res) =>
    historiaCompletaController.obtenerPorPaciente(req, res),
);
router.get('/paciente/:idPaciente/estudios', (req, res) =>
    historiaCompletaController.estudiosPorPaciente(req, res),
);

export default router;
