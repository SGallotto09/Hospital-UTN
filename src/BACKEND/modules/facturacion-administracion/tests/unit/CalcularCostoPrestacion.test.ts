
import { describe, it, expect } from 'vitest';

import { CalcularCostoPrestacion } from '../../use-cases/CalcularCostoPrestacion.js';
import { CoberturaPublica } from '../../domain/strategies/CoberturaPublica.js';
import { CoberturaPrepaga } from '../../domain/strategies/CoberturaPrepaga.js';
import { CoberturaParticular } from '../../domain/strategies/CoberturaParticular.js';

describe('Calcular costo de prestación', () => {

  it('Calcula correctamente la cobertura pública', () => {
    const casoDeUso = new CalcularCostoPrestacion(new CoberturaPublica());

    const resultado = casoDeUso.ejecutar(15000);

    expect(resultado.montoPaciente).toBe(0);
    expect(resultado.montoCobertura).toBe(15000);
  });

  it('Calcula correctamente la cobertura prepaga', () => {
    const casoDeUso = new CalcularCostoPrestacion(new CoberturaPrepaga(3000));

    const resultado = casoDeUso.ejecutar(15000);

    expect(resultado.montoPaciente).toBe(3000);
    expect(resultado.montoCobertura).toBe(12000);
  });

  it('Calcula correctamente la cobertura particular', () => {
    const casoDeUso = new CalcularCostoPrestacion(new CoberturaParticular());

    const resultado = casoDeUso.ejecutar(15000);

    expect(resultado.montoPaciente).toBe(15000);
    expect(resultado.montoCobertura).toBe(0);
  });

  it('Rechaza un copago mayor al costo de la consulta', () => {
    const casoDeUso = new CalcularCostoPrestacion(new CoberturaPrepaga(20000));

    expect(() => casoDeUso.ejecutar(15000)).toThrow('El copago no es válido');
  });

});
