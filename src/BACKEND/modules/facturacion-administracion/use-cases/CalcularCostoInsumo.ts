
export class CalcularCostoInsumo {

  ejecutar(cantidad: number, precioUnitario: number): number {

    if (cantidad <= 0) {
      throw new Error('La cantidad debe ser mayor a cero');
    }

    if (precioUnitario < 0) {
      throw new Error('El precio no puede ser negativo');
    }

    return cantidad * precioUnitario;
  }

}
