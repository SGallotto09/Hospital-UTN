
export interface IPrecioInsumoRepository {

  obtenerPrecio(idInsumo: number): Promise<number | null>;

}
