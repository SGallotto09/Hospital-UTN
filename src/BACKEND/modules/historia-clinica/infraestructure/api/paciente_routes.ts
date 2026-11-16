import { Router } from 'express'
import { pacienteController } from './paciente_dependencies.js'

const router: Router = Router()

router.post('/', (req, res) => pacienteController.registrar(req, res))

router.get('/', (req, res) => pacienteController.obtenerTodos(req, res))

router.get('/dni/:dni', (req, res) => pacienteController.obtenerPorDni(req, res))

router.get('/:id', (req, res) => pacienteController.obtenerPorId(req, res))

export default router
