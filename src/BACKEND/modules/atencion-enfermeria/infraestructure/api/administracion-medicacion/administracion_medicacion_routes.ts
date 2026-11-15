import express, { type Router } from 'express';
import { administracionMedicacionController } from './administracion_medicacion_dependencies.js';

const router: Router = express.Router();

router.get('/', (req, res) => {
    return administracionMedicacionController.obtenerTodas(req, res);
});

export default router;