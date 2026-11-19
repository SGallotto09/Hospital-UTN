import type { AsignacionCama } from '../entities/AsignacionCama.js'
import type { Cama } from '../entities/Cama.js'

export interface SolicitudAsignacion {
  idCama: number
  idPaciente: number
  idUsuarioAsignador: number
}

export interface IAsignacionCamaRepository {
  // La lectura bloqueada, la regla y la persistencia deben compartir una transacción exclusiva.
  asignarSiDisponible(
    solicitud: SolicitudAsignacion,
    ocupar: (cama: Cama) => void,
  ): Promise<AsignacionCama>
}
