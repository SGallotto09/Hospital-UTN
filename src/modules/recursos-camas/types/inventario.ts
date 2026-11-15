export interface Insumo {
  id: number
  nombre: string
  stock: number
  piso: number | null
}

export interface ResultadoConsumo {
  estado: 'descontado' | 'duplicado'
  idEvento: string
  idAdministracion: number
  idInsumo: number
  cantidadDescontada: number
  stockRestante: number | null
}

export interface InventarioApi {
  listar(): Promise<Insumo[]>
}
