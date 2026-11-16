
import { describe, it, expect } from 'vitest';

import { CalcularCostoInsumo } from '../../use-cases/CalcularCostoInsumo.js';

describe('Calcular costo de insumo', () => {

  it('Calcula correctamente el costo del medicamento', () => {

    const calcularCosto = new CalcularCostoInsumo();

    const resultado = calcularCosto.ejecutar(3, 2500);

    expect(resultado).toBe(7500);

  });

  it('Rechaza cantidades menores o iguales a cero', () => {

    const calcularCosto = new CalcularCostoInsumo();

    expect(() => calcularCosto.ejecutar(0, 2500))
      .toThrow('La cantidad debe ser mayor a cero');

  });

  it('Rechaza precios negativos', () => {

    const calcularCosto = new CalcularCostoInsumo();

    expect(() => calcularCosto.ejecutar(3, -2500))
      .toThrow('El precio no puede ser negativo');

  });

});
