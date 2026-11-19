import { Router } from 'express';
import { dashboardController } from '../dashboard/dashboard_dependencies.js';
import { verificarRol } from '../../../../IAM/infraestructure/middlewares/verificarRol.js';

const router: Router = Router();

router.get('/', verificarRol(['Enfermero']), (req, res) =>
    dashboardController.obtener(req, res)
);

export default router;
