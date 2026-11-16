
import { describe, it, expect } from 'vitest';

import { CrearCuentaFacturacion } from '../../use-cases/CrearCuentaFacturacion.js';
import { CuentaFacturacion } from '../../domain/entities/CuentaFacturacion.js';

describe('Crear cuenta de facturación', () => {

  it('Crea una cuenta si el paciente no tiene una activa', async () => {

    const repositorio = {
      async buscarActivaPorPaciente() {
        return null;
      },
      async crear(idPaciente: number) {
        return new CuentaFacturacion(1, idPaciente);
      }
    };

    const crearCuenta = new CrearCuentaFacturacion(repositorio);

    const resultado = await crearCuenta.ejecutar(5);

    expect(resultado.idPaciente).toBe(5);

  });

  it('Rechaza crear una cuenta si ya existe una activa', async () => {

    const repositorio = {
      async buscarActivaPorPaciente() {
        return new CuentaFacturacion(1, 5);
      },
      async crear(idPaciente: number) {
        return new CuentaFacturacion(2, idPaciente);
      }
    };

    const crearCuenta = new CrearCuentaFacturacion(repositorio);

    await expect(crearCuenta.ejecutar(5))
      .rejects.toThrow('El paciente ya tiene una cuenta activa');

  });

  it('Rechaza un ID de paciente inválido', async () => {

    const repositorio = {
      async buscarActivaPorPaciente() {
        return null;
      },
      async crear(idPaciente: number) {
        return new CuentaFacturacion(1, idPaciente);
      }
    };

    const crearCuenta = new CrearCuentaFacturacion(repositorio);

    await expect(crearCuenta.ejecutar(0))
      .rejects.toThrow('El ID del paciente no es válido');

  });

});
