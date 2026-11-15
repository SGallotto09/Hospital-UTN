import type { CamaDTO } from '../dtos/CamasDTO.js'

export interface IConsultaCamas {
  listar(): Promise<CamaDTO[]>
}
