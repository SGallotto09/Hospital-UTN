import type { Cama } from '../entities/Cama.js'

export interface DatosRegistroCama {
  habitacion: number
  piso: number
  idTipoCama: number
}

export interface IRegistroCamaRepository {
  registrar(datos: DatosRegistroCama): Promise<Cama>
}
