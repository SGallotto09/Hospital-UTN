import { Router } from 'express';
import { dashboardController } from '../dashboard/dashboard_dependencies.js';

const router: Router = Router();

router.get('/', (req, res) =>
    dashboardController.obtener(req, res)
);

export default router;
