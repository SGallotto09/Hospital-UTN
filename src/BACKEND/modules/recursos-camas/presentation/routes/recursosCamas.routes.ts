import {
  Router,
  type ErrorRequestHandler,
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import type { CamasController } from '../controlers/CamasController.js'
import type { InventarioController } from '../controlers/InventarioController.js'
import { ErrorRecursosCamas, type CodigoError } from '../../domain/errors/ErrorRecursosCamas.js'

const estadosHttp: Record<CodigoError, number> = {
  DATOS_INVALIDOS: 400,
  CAMA_NO_ENCONTRADA: 404,
  PACIENTE_NO_ENCONTRADO: 404,
  PACIENTE_YA_ASIGNADO: 409,
  CAMA_NO_DISPONIBLE: 409,
  TRANSICION_INVALIDA: 409,
  TRANSACCIONES_NO_DISPONIBLES: 503,
  AUTENTICACION_REQUERIDA: 401,
  ACCESO_DENEGADO: 403,
  INSUMO_NO_ENCONTRADO: 404,
  STOCK_INSUFICIENTE: 409,
  PISO_INSUMO_INVALIDO: 409,
  CONSUMO_INCONSISTENTE: 409,
  DEDUPLICACION_NO_DISPONIBLE: 503,
}

const manejarError: ErrorRequestHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!(error instanceof ErrorRecursosCamas)) {
    next(error)
    return
  }
  res.status(estadosHttp[error.codigo]).json({ codigo: error.codigo, mensaje: error.message })
}

export function crearRecursosCamasRouter(
  controller: CamasController,
  inventario: InventarioController,
  soloLectura = false,
  permitirAsignacion = true,
): Router {
  const router = Router()
  router.get('/camas', controller.listar)
  router.get('/insumos', inventario.listar)
  if (!soloLectura) {
    if (permitirAsignacion) {
      router.get('/pacientes', controller.buscarPaciente)
      router.post('/asignaciones', controller.asignar)
    }
    router.post('/camas/:idCama/liberacion', controller.transicionar('liberar'))
    router.post(
      '/camas/:idCama/confirmacion-limpieza',
      controller.transicionar('confirmar-limpieza'),
    )
    router.post('/camas/:idCama/bloqueo', controller.transicionar('bloquear'))
    router.post(
      '/camas/:idCama/fin-mantenimiento',
      controller.transicionar('finalizar-mantenimiento'),
    )
  }
  router.use(manejarError)
  return router
}
