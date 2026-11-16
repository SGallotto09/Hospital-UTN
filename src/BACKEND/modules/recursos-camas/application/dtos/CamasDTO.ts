import type { EstadoCamaNombre } from '../../domain/states/EstadoCama.js'
import type {
  SolicitudTransicionCama,
  ResultadoTransicionCama,
} from '../../domain/repositories/ITransicionCamaRepository.js'

export type TransicionCamaDTO = SolicitudTransicionCama & { idUsuario: number }
export type TransicionCamaResultadoDTO = Omit<ResultadoTransicionCama, 'fechaEgreso'> & {
  fechaEgreso: string | null
}

export interface CamaDTO {
  id: number
  estado: EstadoCamaNombre
  habitacion: number
  piso: number
  idTipoCama: number
  tipo: string
  disponible: boolean
  idAsignacionActiva: number | null
}

export interface AsignacionCamaDTO {
  id: number
  idCama: number
  idPaciente: number
  idUsuarioAsignador: number
  fechaIngreso: string
}
