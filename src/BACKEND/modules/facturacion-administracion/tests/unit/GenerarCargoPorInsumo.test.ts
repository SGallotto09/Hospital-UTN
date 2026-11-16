
import { describe, it, expect } from 'vitest';

import { GenerarCargoPorInsumo } from '../../use-cases/GenerarCargoPorInsumo.js';
import { CuentaFacturacion } from '../../domain/entities/CuentaFacturacion.js';

describe('Generar cargo por insumo', () => {

  it('Agrega el costo de un medicamento a la cuenta', () => {

    const cuenta = new CuentaFacturacion(10, 1);
    const generarCargo = new GenerarCargoPorInsumo();

    generarCargo.ejecutar(
      cuenta,
      1,
      'Ibuprofeno 400mg',
      2500,
      15
    );

    expect(cuenta.calcularTotal()).toBe(2500);

  });

  it('Rechaza un cargo con importe negativo', () => {

    const cuenta = new CuentaFacturacion(10, 1);
    const generarCargo = new GenerarCargoPorInsumo();

    expect(() => generarCargo.ejecutar(
      cuenta,
      2,
      'Ibuprofeno 400mg',
      -2500,
      16
    )).toThrow('El importe del cargo no puede ser negativo');

  });

  it('Rechaza cargos de una misma administración de medicación', () => {

    const cuenta = new CuentaFacturacion(10, 1);
    const generarCargo = new GenerarCargoPorInsumo();

    generarCargo.ejecutar(
      cuenta,
      1,
      'Ibuprofeno',
      2500,
      15
    );

    expect(() => generarCargo.ejecutar(
      cuenta,
      2,
      'Ibuprofeno',
      2500,
      15
    )).toThrow('Esta administración de medicación ya fue cobrada');

    expect(cuenta.calcularTotal()).toBe(2500);

  });

});
