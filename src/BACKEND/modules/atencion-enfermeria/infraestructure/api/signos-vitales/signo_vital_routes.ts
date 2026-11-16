
import { Router } from 'express';
import { signoVitalController } from './signo_vital_dependencies.js';
import { verificarRol } from '../../../../IAM/infraestructure/middlewares/verificarRol.js';

const router: Router = Router();

router.post(
    '/',
    verificarRol(['Enfermero']),
    (req, res) => {
        req.body.id_enfermero = req.session.usuarioId;
        return signoVitalController.registrar(req, res);
    }
);

router.get('/', (req, res) =>
    signoVitalController.obtenerTodos(req, res)
);

router.get('/paciente/:idPaciente', (req, res) =>
    signoVitalController.obtenerPorPaciente(req, res)
);

export default router;
