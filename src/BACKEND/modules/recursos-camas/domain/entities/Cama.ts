import { crearEstadoCama, type EstadoCama, type EstadoCamaNombre } from '../states/EstadoCama.js'
import { validarId } from '../errors/ErrorRecursosCamas.js'

export interface CamaProps {
  id: number
  estado: EstadoCamaNombre
  habitacion: number
  piso: number
  idTipoCama: number
}

export class Cama {
  private estadoActual: EstadoCama
  readonly id: number
  readonly habitacion: number
  readonly piso: number
  readonly idTipoCama: number

  constructor(props: CamaProps) {
    validarId(props.id, 'idCama')
    validarId(props.idTipoCama, 'idTipoCama')
    this.id = props.id
    this.habitacion = props.habitacion
    this.piso = props.piso
    this.idTipoCama = props.idTipoCama
    this.estadoActual = crearEstadoCama(props.estado)
  }

  get estado(): EstadoCamaNombre {
    return this.estadoActual.nombre
  }
  ocupar(): void {
    this.estadoActual = this.estadoActual.ocupar()
  }
  liberar(): void {
    this.estadoActual = this.estadoActual.liberar()
  }
  confirmarLimpieza(): void {
    this.estadoActual = this.estadoActual.confirmarLimpieza()
  }
  bloquear(): void {
    this.estadoActual = this.estadoActual.bloquear()
  }
  finalizarMantenimiento(): void {
    this.estadoActual = this.estadoActual.finalizarMantenimiento()
  }
}
