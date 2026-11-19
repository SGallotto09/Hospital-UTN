
import { Router } from 'express';
import { protocolo_atencion_controller } from '../../api/protocolos/protocolo_atencion_controlles.js';
import { verificarRol } from '../../../../IAM/infraestructure/middlewares/verificarRol.js';

const router: Router = Router();

router.post(
    '/',
    verificarRol(['Enfermero']),
    (req, res) => protocolo_atencion_controller.generar(req, res)
);

router.get(
    '/paciente/:idPaciente',
    verificarRol(['Enfermero']),
    (req, res) => protocolo_atencion_controller.obtenerPorPaciente(req, res)
);

router.patch(
    '/tareas/:idTarea',
    verificarRol(['Enfermero']),
    (req, res) => protocolo_atencion_controller.actualizarEstadoTarea(req, res)
);

export default router;
