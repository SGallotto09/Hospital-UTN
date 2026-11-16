
import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';

import { FacturacionController } from '../../infraestructure/api/FacturacionController.js';

import type { CrearCuentaFacturacion } from '../../use-cases/CrearCuentaFacturacion.js';
import type { RegistrarCargoFacturacion } from '../../use-cases/RegistrarCargoFacturacion.js';
import type { FacturarPrestacion } from '../../use-cases/FacturarPrestacion.js';

import type { ICuentaFacturacionRepository } from '../../domain/repositories/ICuentaFacturacionRepository.js';

function prepararPrueba(body: unknown) {

  const facturarPrestacion = {
    ejecutar: vi.fn()
  };

  const controller = new FacturacionController(
    {} as CrearCuentaFacturacion,
    {} as ICuentaFacturacionRepository,
    {} as RegistrarCargoFacturacion,
    facturarPrestacion as unknown as FacturarPrestacion
  );

  const req = { body } as Request;

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn()
  } as unknown as Response;

  return {
    controller,
    req,
    res,
    facturarPrestacion
  };
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

  it('responde correctamente cuando una prestación se factura', async () => {

    const datos = {
      idCuenta: 10,
      concepto: 'Consulta Médica General',
      valorBase: 15000,
      tipoCobertura: 'prepaga',
      copago: 3000,
      entidadDestino: 'Prepaga de Prueba'
    };

    const { controller, req, res, facturarPrestacion } =
      prepararPrueba(datos);

    facturarPrestacion.ejecutar.mockResolvedValue({
      idCargo: 20,
      idReclamo: 30,
      montoPaciente: 3000,
      montoCobertura: 12000
    });

    await controller.facturar(req, res);

    expect(facturarPrestacion.ejecutar)
      .toHaveBeenCalledWith(datos);

    expect(res.status).toHaveBeenCalledWith(201);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        idCargo: 20,
        idReclamo: 30,
        montoPaciente: 3000,
        montoCobertura: 12000
      })
    );
  });

});
