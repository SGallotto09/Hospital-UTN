import type { Request, Response, NextFunction, RequestHandler } from 'express'
import type { AsignarCama } from '../../application/use-cases/AsignarCama.js'
import type { IConsultaCamas } from '../../application/ports/IConsultaCamas.js'
import { ErrorRecursosCamas, validarId } from '../../domain/errors/ErrorRecursosCamas.js'
import { validarAsignacion } from '../validators/asignacionValidator.js'
import type { TransicionarCama } from '../../application/use-cases/TransicionarCama.js'
import type { AccionCama } from '../../domain/repositories/ITransicionCamaRepository.js'
import { validarTransicion } from '../validators/transicionValidator.js'
import type { IPacienteGateway } from '../../application/ports/IPacienteGateway.js'
import type { ICamaRepository } from '../../domain/repositories/ICamaRepository.js'
import type { RegistrarCama } from '../../application/use-cases/RegistrarCama.js'

export interface ActorRecursosCamas {
  idUsuario: number
  permisos: readonly string[]
}

// El composition root proporciona un lector del contexto validado por IAM.
export type ObtenerActor = (request: Request) => ActorRecursosCamas | undefined

export class CamasController {
  constructor(
    private readonly consultaCamas: IConsultaCamas,
    private readonly asignarCama: AsignarCama | undefined,
    private readonly obtenerActor: ObtenerActor,
    private readonly transicionarCama: TransicionarCama | undefined,
    private readonly pacientes?: IPacienteGateway,
    private readonly registrarCama?: RegistrarCama,
    private readonly catalogoCamas?: ICamaRepository,
  ) {}

  private exigirPermiso(req: Request, permiso: string): ActorRecursosCamas {
    const actor = this.obtenerActor(req)
    if (!actor)
      throw new ErrorRecursosCamas('AUTENTICACION_REQUERIDA', 'Iniciá sesión para acceder.')
    validarId(actor.idUsuario, 'idUsuario')
    if (!actor.permisos.includes(permiso)) {
      throw new ErrorRecursosCamas('ACCESO_DENEGADO', 'No tenés permiso para realizar esta acción.')
    }
    return actor
  }

  listar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      this.exigirPermiso(req, 'camas:consultar')
      res.status(200).json({ camas: await this.consultaCamas.listar() })
    } catch (error) {
      next(error)
    }
  }

  listarTipos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      this.exigirPermiso(req, 'camas:crear')
      if (!this.catalogoCamas) throw new Error('El alta de camas no está disponible.')
      res.json({ tipos: await this.catalogoCamas.listarTipos() })
    } catch (error) { next(error) }
  }

  crear = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      this.exigirPermiso(req, 'camas:crear')
      if (!this.registrarCama) throw new Error('El alta de camas no está disponible.')
      const id = await this.registrarCama.ejecutar(req.body)
      res.status(201).json({ cama: { id, estado: 'Libre' } })
    } catch (error) { next(error) }
  }

  buscarPaciente = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      this.exigirPermiso(req, 'camas:asignar')
      const dni = req.query.dni
      if (typeof dni !== 'string' || !dni.trim()) {
        throw new ErrorRecursosCamas('DATOS_INVALIDOS', 'Ingresá un DNI válido.')
      }
      if (!this.pacientes) throw new Error('No está integrada la consulta de pacientes.')
      const paciente = await this.pacientes.buscarPorDni(dni.trim())
      if (!paciente) {
        throw new ErrorRecursosCamas('PACIENTE_NO_ENCONTRADO', 'No se encontró un paciente con ese DNI.')
      }
      res.set('Cache-Control', 'no-store')
      res.status(200).json({ paciente })
    } catch (error) {
      next(error)
    }
  }

  asignar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = this.exigirPermiso(req, 'camas:asignar')
      if (!this.asignarCama) {
        throw new ErrorRecursosCamas(
          'TRANSACCIONES_NO_DISPONIBLES',
          'Las escrituras no están habilitadas en este montaje de sólo lectura.',
        )
      }
      const datos = validarAsignacion(req.body)
      const asignacion = await this.asignarCama.ejecutar({
        ...datos,
        idUsuarioAsignador: actor.idUsuario,
      })
      res.status(201).json({ asignacion })
    } catch (error) {
      next(error)
    }
  }

  transicionar(accion: AccionCama): RequestHandler {
    const permisos: Record<AccionCama, string> = {
      liberar: 'camas:liberar',
      'confirmar-limpieza': 'camas:limpiar',
      bloquear: 'camas:mantener',
      'finalizar-mantenimiento': 'camas:mantener',
    }
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const actor = this.exigirPermiso(req, permisos[accion])
        if (!this.transicionarCama) {
          throw new ErrorRecursosCamas(
            'TRANSACCIONES_NO_DISPONIBLES',
            'Las escrituras no están habilitadas en este montaje de sólo lectura.',
          )
        }
        const datos = validarTransicion(accion, req.params.idCama, req.body)
        const transicion = await this.transicionarCama.ejecutar({
          ...datos,
          idUsuario: actor.idUsuario,
        })
        res.status(200).json({ transicion })
      } catch (error) {
        next(error)
      }
    }
  }
}
