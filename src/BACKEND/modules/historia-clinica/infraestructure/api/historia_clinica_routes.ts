import { Router } from 'express';
import { verificarSesion } from '../../../IAM/infraestructure/middlewares/verificarSesion.js';
import { verificarRol } from '../../../IAM/infraestructure/middlewares/verificarRol.js';
import pacientes from './paciente_routes.js';
import historia from './historia_completa_routes.js';
import alergias from './alergia_routes.js';
import antecedentes from './antecedente_familiar_routes.js';
import evoluciones from './evolucion_medica_routes.js';

const router = Router();
// Política conservadora: consulta clínica y registro exclusivo del médico de sesión.
router.use(verificarSesion, verificarRol(['Médico', 'Enfermero', 'Administrador']));
router.get('/sesion', (req, res) => {
    res.json({ puedeRegistrar: req.session.rol === 'Médico' });
});
router.use('/pacientes', pacientes);
router.use('/alergias', alergias);
router.use('/antecedentes', antecedentes);
router.use('/evoluciones', evoluciones);
router.use('/', historia);
export default router;
