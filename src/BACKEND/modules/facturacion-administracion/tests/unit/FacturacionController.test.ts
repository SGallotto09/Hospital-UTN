
import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';

import { FacturacionController } from '../../infraestructure/api/FacturacionController.js';

import type { CrearCuentaFacturacion } from '../../use-cases/CrearCuentaFacturacion.js';
import type { RegistrarCargoFacturacion } from '../../use-cases/RegistrarCargoFacturacion.js';
import type { ICuentaFacturacionRepository } from '../../domain/repositories/ICuentaFacturacionRepository.js';

function prepararPrueba(body: unknown) {
  const controller = new FacturacionController(
    {} as CrearCuentaFacturacion,
    {} as ICuentaFacturacionRepository,
    {} as RegistrarCargoFacturacion
  );

  const req = { body } as Request;

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn()
  } as unknown as Response;

  return { controller, req, res };
}

describe('FacturacionController - HU 1.1', () => {

  it('cobertura pública: paciente paga $0', async () => {
    const { controller, req, res } = prepararPrueba({
      tipoCobertura: 'publica',
      valorBase: 15000
    });

    await controller.calcularPrestacion(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        montoPaciente: 0,
        montoCobertura: 15000
      })
    );
  });

  it('prepaga: paciente paga $3000', async () => {
    const { controller, req, res } = prepararPrueba({
      tipoCobertura: 'prepaga',
      valorBase: 15000,
      copago: 3000
    });

    await controller.calcularPrestacion(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        montoPaciente: 3000,
        montoCobertura: 12000
      })
    );
  });

  it('particular: paciente paga el total', async () => {
    const { controller, req, res } = prepararPrueba({
      tipoCobertura: 'particular',
      valorBase: 15000
    });

    await controller.calcularPrestacion(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        montoPaciente: 15000,
        montoCobertura: 0
      })
    );
  });

  it('rechaza una cobertura inválida', async () => {
    const { controller, req, res } = prepararPrueba({
      tipoCobertura: 'desconocida',
      valorBase: 15000
    });

    await controller.calcularPrestacion(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

});
