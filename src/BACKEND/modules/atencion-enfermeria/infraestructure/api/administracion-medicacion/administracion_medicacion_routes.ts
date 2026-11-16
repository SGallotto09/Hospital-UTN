import express, { type Router } from 'express';
import { administracionMedicacionController } from './administracion_medicacion_dependencies.js';

const router: Router = express.Router();

router.get('/', (req, res) => {
    return administracionMedicacionController.obtenerTodas(req, res);
});

router.post('/', (req, res) => {
    return administracionMedicacionController.administrar(req, res);
});

export default router;