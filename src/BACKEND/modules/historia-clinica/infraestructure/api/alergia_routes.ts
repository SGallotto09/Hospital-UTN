import { Router } from 'express';
import { alergiaController } from './alergia_dependencies.js';

const router: Router = Router();

router.post('/', (req, res) =>
    alergiaController.registrar(req, res)
);

router.get('/paciente/:idPaciente', (req, res) =>
    alergiaController.obtenerPorPaciente(req, res)
);

export default router;
