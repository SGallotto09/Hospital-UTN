
import { Router } from 'express';
import { signoVitalController } from './signo_vital_dependencies.js';
import { verificarRol } from '../../../../IAM/infraestructure/middlewares/verificarRol.js';

const router: Router = Router();

router.post(
    '/',
    verificarRol(['Enfermero']),
    (req, res) => signoVitalController.registrar(req, res)
);

router.get('/', verificarRol(['Enfermero']), (req, res) =>
    signoVitalController.obtenerTodos(req, res)
);

router.get('/paciente/:idPaciente', verificarRol(['Enfermero']), (req, res) =>
    signoVitalController.obtenerPorPaciente(req, res)
);

export default router;
