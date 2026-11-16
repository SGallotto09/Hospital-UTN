
import { describe, it, expect } from 'vitest';

import { CalcularCostoMedicacion } from '../../use-cases/CalcularCostoMedicacion.js';

describe('Calcular costo de medicacion', () => {

  const repositorio = {
    async obtenerPrecio(idInsumo: number): Promise<number | null> {
      if (idInsumo === 5) {
        return 2500;
      }

      return null;
    }
  };

  it('Calcula correctamente el costo total del medicamento', async () => {

    const calcular = new CalcularCostoMedicacion(repositorio);

    const resultado = await calcular.ejecutar(5, 3);

    expect(resultado).toBe(7500);

  });

  it('Rechaza un insumo que no tiene precio registrado', async () => {

    const calcular = new CalcularCostoMedicacion(repositorio);

    await expect(calcular.ejecutar(10, 3))
      .rejects.toThrow('No se encontró el precio del insumo');

  });

  it('Rechaza un ID de insumo inválido', async () => {

    const calcular = new CalcularCostoMedicacion(repositorio);

    await expect(calcular.ejecutar(0, 3))
      .rejects.toThrow('El ID del insumo no es válido');

  });

});
