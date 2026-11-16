import { ErrorRecursosCamas, validarId } from '../errors/ErrorRecursosCamas.js'

export interface InsumoDatos {
  id: number
  nombre: string
  stock: number
  piso: number | null
}

export function validarCantidad(cantidad: number): void {
  if (!Number.isInteger(cantidad) || cantidad <= 0 || cantidad > 2147483647) {
    throw new ErrorRecursosCamas(
      'DATOS_INVALIDOS',
      'La cantidad debe ser un entero positivo válido.',
    )
  }
}

export function validarPiso(piso: number): void {
  if (!Number.isInteger(piso) || piso < -2147483648 || piso > 2147483647) {
    throw new ErrorRecursosCamas('DATOS_INVALIDOS', 'El piso debe ser un entero válido.')
  }
}

export class Insumo {
  readonly id: number
  readonly nombre: string
  readonly piso: number | null
  private existencias: number

  constructor(datos: InsumoDatos) {
    validarId(datos.id, 'idInsumo')
    if (
      !datos.nombre.trim() ||
      !Number.isInteger(datos.stock) ||
      datos.stock < 0 ||
      datos.stock > 2147483647
    ) {
      throw new ErrorRecursosCamas(
        'DATOS_INVALIDOS',
        'El insumo debe tener nombre y stock entero no negativo.',
      )
    }
    if (datos.piso !== null) validarPiso(datos.piso)
    this.id = datos.id
    this.nombre = datos.nombre
    this.piso = datos.piso
    this.existencias = datos.stock
  }

  get stock(): number {
    return this.existencias
  }

  descontar(cantidad: number, piso: number): void {
    validarCantidad(cantidad)
    validarPiso(piso)
    if (this.piso !== piso) {
      throw new ErrorRecursosCamas(
        'PISO_INSUMO_INVALIDO',
        'El insumo no pertenece al piso del consumo.',
      )
    }
    if (this.existencias < cantidad) {
      throw new ErrorRecursosCamas(
        'STOCK_INSUFICIENTE',
        'No hay stock suficiente para registrar este consumo.',
      )
    }
    this.existencias -= cantidad
  }
}
