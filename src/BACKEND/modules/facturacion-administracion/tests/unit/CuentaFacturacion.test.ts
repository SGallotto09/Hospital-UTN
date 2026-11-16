
import { describe, it, expect } from 'vitest';

import { Prestacion } from '../../domain/entities/Prestacion.js';
import { Cargo } from '../../domain/entities/Cargo.js';
import { CuentaFacturacion } from '../../domain/entities/CuentaFacturacion.js';

describe('Cuenta de Facturación', () => {

  it('Agrega cargos y calcula el total correctamente', () => {

    const cuenta = new CuentaFacturacion(10, 1);

    const consulta = new Prestacion(1, 'Consulta Médica', 15000);

    const cargo1 = new Cargo(1, 10, consulta.nombre, consulta.valorBase);
    const cargo2 = new Cargo(2, 10, 'Medicamento', 2500);
    const cargo3 = new Cargo(3, 10, 'Estudio médico', 8000);

    cuenta.agregarCargo(cargo1);
    cuenta.agregarCargo(cargo2);
    cuenta.agregarCargo(cargo3);

    expect(cuenta.calcularTotal()).toBe(25500);

  });

  it('Rechaza cargos de otra cuenta', () => {

    const cuenta = new CuentaFacturacion(10, 1);

    const cargo = new Cargo(4, 99, 'Medicamento', 2500);

    expect(() => cuenta.agregarCargo(cargo))
      .toThrow('El cargo no pertenece a esta cuenta');

  });

});
