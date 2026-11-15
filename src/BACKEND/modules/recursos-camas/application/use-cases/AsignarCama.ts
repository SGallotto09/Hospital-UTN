import type { AsignacionCamaDTO } from '../dtos/CamasDTO.js'
import type {
  IAsignacionCamaRepository,
  SolicitudAsignacion,
} from '../../domain/repositories/IAsignacionCamaRepository.js'
import type { IPacienteGateway } from '../ports/IPacienteGateway.js'
import { ErrorRecursosCamas, validarId } from '../../domain/errors/ErrorRecursosCamas.js'

export class AsignarCama {
  constructor(
    private readonly asignaciones: IAsignacionCamaRepository,
    private readonly pacientes: IPacienteGateway,
  ) {}

  async ejecutar(solicitud: SolicitudAsignacion): Promise<AsignacionCamaDTO> {
    validarId(solicitud.idCama, 'idCama')
    validarId(solicitud.idPaciente, 'idPaciente')
    validarId(solicitud.idUsuarioAsignador, 'idUsuarioAsignador')
    if (!(await this.pacientes.existe(solicitud.idPaciente))) {
      throw new ErrorRecursosCamas('PACIENTE_NO_ENCONTRADO', 'El paciente no está registrado.')
    }
    const asignacion = await this.asignaciones.asignarSiDisponible(solicitud, (cama) =>
      cama.ocupar(),
    )
    return {
      id: asignacion.id,
      idCama: asignacion.idCama,
      idPaciente: asignacion.idPaciente,
      idUsuarioAsignador: asignacion.idUsuarioAsignador,
      fechaIngreso: asignacion.fechaIngreso.toISOString(),
    }
  }
}
