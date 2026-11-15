import { Cama } from '../../domain/entities/Cama.js'
import type { EstadoCamaNombre } from '../../domain/states/EstadoCama.js'
import { ErrorRecursosCamas } from '../../domain/errors/ErrorRecursosCamas.js'
import type { RowDataPacket } from 'mysql2/promise'

export interface CamaFila extends RowDataPacket {
  id: number
  estado: string
  habitacion: number
  piso: number
  id_tipo_cama: number
}

// Los documentos usan singular y plural; la aplicación entrega siempre el singular.
export function mapearEstado(valor: string): EstadoCamaNombre {
  switch (valor.trim().toLocaleLowerCase('es')) {
    case 'libre':
    case 'libres':
      return 'Libre'
    case 'ocupada':
    case 'ocupadas':
      return 'Ocupada'
    case 'en limpieza':
      return 'En limpieza'
    case 'bloqueada':
    case 'bloqueadas':
      return 'Bloqueada'
    default:
      throw new ErrorRecursosCamas('DATOS_INVALIDOS', `Estado de cama no reconocido: ${valor}.`)
  }
}

export function mapearCama(fila: CamaFila): Cama {
  return new Cama({
    id: fila.id,
    estado: mapearEstado(fila.estado),
    habitacion: fila.habitacion,
    piso: fila.piso,
    idTipoCama: fila.id_tipo_cama,
  })
}
