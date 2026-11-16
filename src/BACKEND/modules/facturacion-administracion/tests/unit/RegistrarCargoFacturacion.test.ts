
import { describe, it, expect, vi } from 'vitest';

import { RegistrarCargoFacturacion } from '../../use-cases/RegistrarCargoFacturacion.js';
import { Cargo } from '../../domain/entities/Cargo.js';

describe('Registrar cargo de facturación', () => {

  it('Registra correctamente un cargo por medicamento', async () => {

    const cargo = new Cargo(1, 10, 'Ibuprofeno', 2500, 15);

    const repositorio = {
      buscarPorAdministracion: vi.fn().mockResolvedValue(null),
      guardar: vi.fn().mockResolvedValue(cargo)
    };

    const registrar = new RegistrarCargoFacturacion(repositorio);

    const resultado = await registrar.ejecutar(cargo);

    expect(resultado.importe).toBe(2500);
    expect(repositorio.guardar).toHaveBeenCalledOnce();

  });

  it('Rechaza una administración que ya fue cobrada', async () => {

    const cargo = new Cargo(1, 10, 'Ibuprofeno', 2500, 15);

    const repositorio = {
      buscarPorAdministracion: vi.fn().mockResolvedValue(cargo),
      guardar: vi.fn().mockResolvedValue(cargo)
    };

    const registrar = new RegistrarCargoFacturacion(repositorio);

    await expect(registrar.ejecutar(cargo))
      .rejects.toThrow('Esta administración de medicación ya fue cobrada');

    expect(repositorio.guardar).not.toHaveBeenCalled();

  });

  it('Rechaza cargos con una cuenta inválida', async () => {

    const cargo = new Cargo(1, 0, 'Ibuprofeno', 2500, 15);

    const repositorio = {
      buscarPorAdministracion: vi.fn().mockResolvedValue(null),
      guardar: vi.fn().mockResolvedValue(cargo)
    };

    const registrar = new RegistrarCargoFacturacion(repositorio);

    await expect(registrar.ejecutar(cargo))
      .rejects.toThrow('La cuenta de facturación no es válida');

  });

  it('Permite registrar un cargo por consulta médica', async () => {

    const cargo = new Cargo(2, 10, 'Consulta médica', 15000, null);

    const repositorio = {
      buscarPorAdministracion: vi.fn().mockResolvedValue(null),
      guardar: vi.fn().mockResolvedValue(cargo)
    };

    const registrar = new RegistrarCargoFacturacion(repositorio);

    const resultado = await registrar.ejecutar(cargo);

    expect(resultado.importe).toBe(15000);
    expect(repositorio.guardar).toHaveBeenCalledOnce();
    expect(repositorio.buscarPorAdministracion).not.toHaveBeenCalled();

  });

});
