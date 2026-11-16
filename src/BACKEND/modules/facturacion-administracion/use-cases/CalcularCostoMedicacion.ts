
import type { IPrecioInsumoRepository } from '../domain/repositories/IPrecioInsumoRepository.js';

import { CalcularCostoInsumo } from './CalcularCostoInsumo.js';

export class CalcularCostoMedicacion {

  constructor(
    private repositorio: IPrecioInsumoRepository
  ) {}

  async ejecutar(idInsumo: number, cantidad: number): Promise<number> {

    if (idInsumo <= 0) {
      throw new Error('El ID del insumo no es válido');
    }

    const precio = await this.repositorio.obtenerPrecio(idInsumo);

    if (precio === null) {
      throw new Error('No se encontró el precio del insumo');
    }

    const calcularCosto = new CalcularCostoInsumo();

    return calcularCosto.ejecutar(cantidad, precio);
  }

}
