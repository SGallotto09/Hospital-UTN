
import type { Request, Response } from 'express';

import { Cargo } from '../../domain/entities/Cargo.js';

import { CoberturaPublica } from '../../domain/strategies/CoberturaPublica.js';
import { CoberturaPrepaga } from '../../domain/strategies/CoberturaPrepaga.js';
import { CoberturaParticular } from '../../domain/strategies/CoberturaParticular.js';

import type { ICoberturaStrategy } from '../../domain/strategies/ICoberturaStrategy.js';
import type { ICuentaFacturacionRepository } from '../../domain/repositories/ICuentaFacturacionRepository.js';

import { CrearCuentaFacturacion } from '../../use-cases/CrearCuentaFacturacion.js';
import { RegistrarCargoFacturacion } from '../../use-cases/RegistrarCargoFacturacion.js';
import { CalcularCostoPrestacion } from '../../use-cases/CalcularCostoPrestacion.js';

export class FacturacionController {

  constructor(
    private crearCuenta: CrearCuentaFacturacion,
    private repositorio: ICuentaFacturacionRepository,
    private registrarCargo: RegistrarCargoFacturacion
  ) {}

  // ========================================
  // CREAR CUENTA
  // ========================================

  async crear(req: Request, res: Response): Promise<void> {

    const idPaciente = req.body?.idPaciente;

    if (!Number.isSafeInteger(idPaciente) || idPaciente <= 0) {
      res.status(400).json({
        mensaje: 'El ID del paciente no es válido'
      });
      return;
    }

    try {
      const cuenta = await this.crearCuenta.ejecutar(idPaciente);

      res.status(201).json({
        mensaje: 'Cuenta creada correctamente',
        cuenta
      });

    } catch (error) {

      if (
        error instanceof Error &&
        error.message === 'El paciente ya tiene una cuenta activa'
      ) {
        res.status(409).json({
          mensaje: error.message
        });
        return;
      }

      console.error('Error al crear cuenta', error);

      res.status(500).json({
        mensaje: 'No se pudo crear la cuenta'
      });
    }
  }

  // ========================================
  // BUSCAR CUENTA ACTIVA
  // ========================================

  async buscarActiva(req: Request, res: Response): Promise<void> {

    const idPaciente = Number(req.params.idPaciente);

    if (!Number.isSafeInteger(idPaciente) || idPaciente <= 0) {
      res.status(400).json({
        mensaje: 'El ID del paciente no es válido'
      });
      return;
    }

    try {
      const cuenta =
        await this.repositorio.buscarActivaPorPaciente(idPaciente);

      if (cuenta === null) {
        res.status(404).json({
          mensaje: 'No se encontró una cuenta activa'
        });
        return;
      }

      res.status(200).json({ cuenta });

    } catch (error) {

      console.error('Error al buscar cuenta', error);

      res.status(500).json({
        mensaje: 'No se pudo consultar la cuenta'
      });
    }
  }

  // ========================================
  // REGISTRAR CARGO MANUAL
  // ========================================

  async registrarManual(req: Request, res: Response): Promise<void> {

    const {
      idCuenta,
      concepto,
      importe,
      idAdministracionMedicacion
    } = req.body ?? {};

    if (!Number.isSafeInteger(idCuenta) || idCuenta <= 0) {
      res.status(400).json({
        mensaje: 'La cuenta de facturación no es válida'
      });
      return;
    }

    if (
      typeof concepto !== 'string' ||
      concepto.trim().length === 0 ||
      concepto.trim().length > 100
    ) {
      res.status(400).json({
        mensaje: 'El concepto del cargo no es válido'
      });
      return;
    }

    if (
      typeof importe !== 'number' ||
      !Number.isFinite(importe) ||
      importe < 0 ||
      importe > 99999999.99 ||
      Math.round(importe * 100) / 100 !== importe
    ) {
      res.status(400).json({
        mensaje: 'El importe debe ser válido y tener hasta dos decimales'
      });
      return;
    }

    if (idAdministracionMedicacion !== undefined) {
      res.status(400).json({
        mensaje: 'La medicación debe facturarse desde Enfermería'
      });
      return;
    }

    try {
      const cargo = new Cargo(
        0,
        idCuenta,
        concepto.trim(),
        importe,
        null
      );

      const registrado =
        await this.registrarCargo.ejecutar(cargo);

      res.status(201).json({
        mensaje: 'Cargo registrado correctamente',
        cargo: registrado
      });

    } catch (error) {

      console.error('Error al registrar cargo', error);

      res.status(500).json({
        mensaje: 'No se pudo registrar el cargo'
      });
    }
  }

  // ========================================
  // CALCULAR PRESTACIÓN SEGÚN COBERTURA
  // HU 1.1 - PATRÓN STRATEGY
  // ========================================

  async calcularPrestacion(req: Request, res: Response): Promise<void> {

    const {
      tipoCobertura,
      valorBase,
      copago
    } = req.body ?? {};

    if (
      typeof valorBase !== 'number' ||
      !Number.isFinite(valorBase) ||
      valorBase < 0 ||
      valorBase > 99999999.99
    ) {
      res.status(400).json({
        mensaje: 'El valor base de la prestación no es válido'
      });
      return;
    }

    if (
      tipoCobertura !== 'publica' &&
      tipoCobertura !== 'prepaga' &&
      tipoCobertura !== 'particular'
    ) {
      res.status(400).json({
        mensaje: 'El tipo de cobertura no es válido'
      });
      return;
    }

    let estrategia: ICoberturaStrategy;

    switch (tipoCobertura) {

      case 'publica':
        estrategia = new CoberturaPublica();
        break;

      case 'prepaga':

        if (
          typeof copago !== 'number' ||
          !Number.isFinite(copago) ||
          copago < 0 ||
          copago > valorBase
        ) {
          res.status(400).json({
            mensaje: 'El copago no es válido'
          });
          return;
        }

        estrategia = new CoberturaPrepaga(copago);
        break;

      
case 'particular':
  estrategia = new CoberturaParticular();
  break;

default:
  res.status(400).json({
    mensaje: 'El tipo de cobertura no es válido'
  });
  return;

    }

    try {
      const calcular = new CalcularCostoPrestacion(estrategia);

      const resultado = calcular.ejecutar(valorBase);

      res.status(200).json({
        mensaje: 'Prestación calculada correctamente',
        tipoCobertura,
        valorBase,
        montoPaciente: resultado.montoPaciente,
        montoCobertura: resultado.montoCobertura
      });

    } catch (error) {

      console.error('Error al calcular prestación', error);

      res.status(500).json({
        mensaje: 'No se pudo calcular la prestación'
      });
    }
  }
}
