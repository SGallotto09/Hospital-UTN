import type { CamaDTO, TipoCamaDTO } from '../dtos/CamasDTO.js'

export interface IConsultaCamas {
  listar(): Promise<CamaDTO[]>
  listarTiposCama(): Promise<TipoCamaDTO[]>
}
