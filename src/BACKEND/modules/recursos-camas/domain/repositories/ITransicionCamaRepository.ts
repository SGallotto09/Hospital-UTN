import type { Cama } from '../entities/Cama.js'
import type { EstadoCamaNombre } from '../states/EstadoCama.js'

export type AccionCama = 'liberar' | 'confirmar-limpieza' | 'bloquear' | 'finalizar-mantenimiento'
export type MotivoLiberacion = 'alta' | 'traslado'

export type SolicitudTransicionCama = {
  idCama: number
  estadoEsperado: EstadoCamaNombre
} & (
  | { accion: 'liberar'; idAsignacion: number; motivo: MotivoLiberacion }
  | { accion: Exclude<AccionCama, 'liberar'> }
)

export interface ResultadoTransicionCama {
  idCama: number
  estadoAnterior: EstadoCamaNombre
  estado: EstadoCamaNombre
  idAsignacionFinalizada: number | null
  fechaEgreso: Date | null
}

export interface ITransicionCamaRepository {
  // Aplica State con la cama bloqueada; cierre de ocupación y estado se confirman juntos.
  transicionar(
    solicitud: SolicitudTransicionCama,
    aplicar: (cama: Cama) => void,
  ): Promise<ResultadoTransicionCama>
}
