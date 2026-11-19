import type { Request, Response, NextFunction } from 'express'
import type { IInsumoRepository } from '../../domain/repositories/IInsumoRepository.js'
import type { ObtenerActor } from './CamasController.js'
import { ErrorRecursosCamas, validarId } from '../../domain/errors/ErrorRecursosCamas.js'

export class InventarioController {
  constructor(
    private readonly insumos: IInsumoRepository,
    private readonly obtenerActor: ObtenerActor,
  ) {}

  listar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.obtenerActor(req)
      if (!actor)
        throw new ErrorRecursosCamas('AUTENTICACION_REQUERIDA', 'Iniciá sesión para acceder.')
      validarId(actor.idUsuario, 'idUsuario')
      if (!actor.permisos.includes('inventario:consultar')) {
        throw new ErrorRecursosCamas(
          'ACCESO_DENEGADO',
          'No tenés permiso para consultar el inventario.',
        )
      }
      res.status(200).json({ insumos: await this.insumos.listar() })
    } catch (error) {
      next(error)
    }
  }
}
