
import express, { type Router } from 'express';
import { administracionMedicacionController } from './administracion_medicacion_dependencies.js';
import { verificarRol } from '../../../../IAM/infraestructure/middlewares/verificarRol.js';

const router: Router = express.Router();

router.get('/permisos', verificarRol(['Enfermero', 'Médico']), (req, res) =>
    administracionMedicacionController.obtenerPermisos(req, res)
);

router.get('/', verificarRol(['Enfermero', 'Médico']), (req, res) =>
    administracionMedicacionController.obtenerTodas(req, res)
);

router.get('/opciones-indicacion', verificarRol(['Médico']), (req, res) =>
    administracionMedicacionController.obtenerOpcionesIndicacion(req, res)
);

router.post('/indicaciones', verificarRol(['Médico']), (req, res) =>
    administracionMedicacionController.crearIndicacion(req, res)
);

router.get('/historial', verificarRol(['Enfermero']), (req, res) =>
    administracionMedicacionController.obtenerHistorial(req, res)
);

router.post(
    '/',
    verificarRol(['Enfermero']),
    (req, res) => administracionMedicacionController.administrar(req, res)
);

export default router;
