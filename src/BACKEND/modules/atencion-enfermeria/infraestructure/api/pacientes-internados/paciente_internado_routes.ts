import { Router } from 'express';
import { pacienteInternadoController } from './paciente_internado_dependencies.js';
import { verificarRol } from '../../../../IAM/infraestructure/middlewares/verificarRol.js';

const router: Router = Router();

router.get('/', verificarRol(['Administrador', 'Médico', 'Enfermero']), (req, res) =>
    pacienteInternadoController.obtenerTodos(req, res)
);

export default router;
