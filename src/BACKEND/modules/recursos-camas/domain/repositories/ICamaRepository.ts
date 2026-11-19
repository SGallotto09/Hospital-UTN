export interface NuevaCama {
  habitacion: number
  piso: number
  idTipoCama: number
}

export interface TipoCama {
  id: number
  nombre: string
}

export interface ICamaRepository {
  crear(datos: NuevaCama): Promise<number>
  listarTipos(): Promise<TipoCama[]>
}
