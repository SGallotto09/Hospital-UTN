import { Router } from 'express';
import { pacienteInternadoController } from './paciente_internado_dependencies.js';

const router: Router = Router();

router.get('/', (req, res) =>
    pacienteInternadoController.obtenerTodos(req, res)
);

export default router;