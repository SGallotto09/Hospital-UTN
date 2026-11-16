
import { Router } from 'express';

import type { FacturacionController } from './FacturacionController.js';

import { verificarRol } from '../../../IAM/infraestructure/middlewares/verificarRol.js';

export class FacturacionRoutes {

  private router: Router;

  constructor(
    private controller: FacturacionController
  ) {
    this.router = Router();
    this.configurarRutas();
  }

  private configurarRutas(): void {

    // Crear cuenta de facturación
    this.router.post(
      '/cuentas',
      verificarRol(['Administrador']),
      (req, res) => this.controller.crear(req, res)
    );

    // Buscar cuenta activa de un paciente
    this.router.get(
      '/cuentas/paciente/:idPaciente',
      verificarRol(['Administrador']),
      (req, res) => this.controller.buscarActiva(req, res)
    );

    // Registrar cargo manual
    this.router.post(
      '/cargos/manuales',
      verificarRol(['Administrador']),
      (req, res) => this.controller.registrarManual(req, res)
    );

    // HU 1.1 - Calcular una prestación
    this.router.post(
      '/prestaciones/calcular',
      verificarRol(['Administrador']),
      (req, res) => this.controller.calcularPrestacion(req, res)
    );

    // HU 1.1 - Facturar y guardar en MySQL
    this.router.post(
      '/prestaciones/facturar',
      verificarRol(['Administrador']),
      (req, res) => this.controller.facturar(req, res)
    );

  }

  obtenerRouter(): Router {
    return this.router;
  }
}
