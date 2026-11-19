import type { InsumoDatos } from '../entities/Insumo.js'

export interface ConsumoInsumo {
  idEvento: string
  idAdministracion: number
  idInsumo: number
  cantidad: number
  piso: number
}

export interface ResultadoConsumo {
  estado: 'descontado' | 'duplicado'
  idEvento: string
  idAdministracion: number
  idInsumo: number
  cantidadDescontada: number
  stockRestante: number | null
}

export interface IInsumoRepository {
  listar(): Promise<InsumoDatos[]>
  procesarConsumo(consumo: ConsumoInsumo): Promise<ResultadoConsumo>
}
