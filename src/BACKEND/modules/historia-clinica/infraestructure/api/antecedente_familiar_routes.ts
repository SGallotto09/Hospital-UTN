import { verificarRol } from '../../../IAM/infraestructure/middlewares/verificarRol.js';
import { Router } from 'express';
import { antecedenteFamiliarController } from './antecedente_familiar_dependencies.js';

const router: Router = Router();
router.post('/', verificarRol(['Médico']), (req, res) =>
    antecedenteFamiliarController.registrar(req, res),
);
router.get('/paciente/:idPaciente', (req, res) =>
    antecedenteFamiliarController.obtenerPorPaciente(req, res),
);
export default router;
