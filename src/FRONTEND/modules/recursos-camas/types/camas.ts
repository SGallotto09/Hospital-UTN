export type EstadoCama = 'Libre' | 'Ocupada' | 'En limpieza' | 'Bloqueada'

export interface Cama {
  id: number
  estado: EstadoCama
  habitacion: number
  piso: number
  idTipoCama: number
  tipo: string
  disponible: boolean
  idAsignacionActiva: number | null
}

export interface Asignacion {
  id: number
  idCama: number
  idPaciente: number
  idUsuarioAsignador: number
  fechaIngreso: string
}

export interface CamasApi {
  listar(): Promise<Cama[]>
  asignar(idCama: number, idPaciente: number): Promise<Asignacion>
  transicionar(idCama: number, solicitud: SolicitudTransicion): Promise<ResultadoTransicion>
}

export type AccionCama = 'liberar' | 'confirmar-limpieza' | 'bloquear' | 'finalizar-mantenimiento'
export type SolicitudTransicion = { estadoEsperado: EstadoCama } & (
  | { accion: 'liberar'; idAsignacion: number; motivo: 'alta' | 'traslado' }
  | { accion: Exclude<AccionCama, 'liberar'> }
)
export interface ResultadoTransicion {
  idCama: number
  estadoAnterior: EstadoCama
  estado: EstadoCama
  idAsignacionFinalizada: number | null
  fechaEgreso: string | null
}
