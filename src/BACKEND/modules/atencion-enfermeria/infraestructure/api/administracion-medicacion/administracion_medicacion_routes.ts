
import express, { type Router } from 'express';
import { administracionMedicacionController } from './administracion_medicacion_dependencies.js';
import { verificarRol } from '../../../../IAM/infraestructure/middlewares/verificarRol.js';

const router: Router = express.Router();

router.get('/', verificarRol(['Enfermero']), (req, res) =>
    administracionMedicacionController.obtenerTodas(req, res)
);

router.post(
    '/',
    verificarRol(['Enfermero']),
    (req, res) => {
        req.body.id_enfermero = req.session.usuarioId;
        return administracionMedicacionController.administrar(req, res);
    }
);

export default router;
