import { ErrorRecursosCamas } from '../errors/ErrorRecursosCamas.js'

export type EstadoCamaNombre = 'Libre' | 'Ocupada' | 'En limpieza' | 'Bloqueada'

export interface EstadoCama {
  readonly nombre: EstadoCamaNombre
  ocupar(): EstadoCama
  liberar(): EstadoCama
  confirmarLimpieza(): EstadoCama
  bloquear(): EstadoCama
  finalizarMantenimiento(): EstadoCama
}

abstract class EstadoBase implements EstadoCama {
  abstract readonly nombre: EstadoCamaNombre

  ocupar(): EstadoCama {
    throw new ErrorRecursosCamas(
      'CAMA_NO_DISPONIBLE',
      `La cama acaba de ser ocupada o ya no está disponible (estado: ${this.nombre}). Actualizá el mapa.`,
    )
  }

  protected rechazar(accion: string): never {
    throw new ErrorRecursosCamas(
      'TRANSICION_INVALIDA',
      `No se puede ${accion} una cama en estado ${this.nombre}. Actualizá el mapa.`,
    )
  }
  liberar(): EstadoCama {
    return this.rechazar('liberar')
  }
  confirmarLimpieza(): EstadoCama {
    return this.rechazar('confirmar la limpieza de')
  }
  bloquear(): EstadoCama {
    return this.rechazar('bloquear')
  }
  finalizarMantenimiento(): EstadoCama {
    return this.rechazar('finalizar el mantenimiento de')
  }
}

export class Libre extends EstadoBase {
  readonly nombre = 'Libre'
  ocupar(): EstadoCama {
    return new Ocupada()
  }
  bloquear(): EstadoCama {
    return new Bloqueada()
  }
}

export class Ocupada extends EstadoBase {
  readonly nombre = 'Ocupada'
  liberar(): EstadoCama {
    return new EnLimpieza()
  }
}
export class EnLimpieza extends EstadoBase {
  readonly nombre = 'En limpieza'
  confirmarLimpieza(): EstadoCama {
    return new Libre()
  }
  bloquear(): EstadoCama {
    return new Bloqueada()
  }
}
export class Bloqueada extends EstadoBase {
  readonly nombre = 'Bloqueada'
  finalizarMantenimiento(): EstadoCama {
    return new EnLimpieza()
  }
}

export function crearEstadoCama(nombre: EstadoCamaNombre): EstadoCama {
  switch (nombre) {
    case 'Libre':
      return new Libre()
    case 'Ocupada':
      return new Ocupada()
    case 'En limpieza':
      return new EnLimpieza()
    case 'Bloqueada':
      return new Bloqueada()
    default:
      throw new ErrorRecursosCamas('DATOS_INVALIDOS', 'Estado de cama desconocido.')
  }
}
