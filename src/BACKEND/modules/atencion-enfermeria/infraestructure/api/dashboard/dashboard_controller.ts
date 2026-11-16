
import type { Request, Response } from 'express';
import { ObtenerDashboard } from '../../../use-cases/dashboard/obtener_dashboard.js';

export class DashboardController {
    constructor(
        private readonly obtenerDashboard: ObtenerDashboard
    ) {}

    async obtener(_req: Request, res: Response): Promise<void> {
        try {
            const pacientes = await this.obtenerDashboard.ejecutar();
            res.status(200).json(pacientes);
        } catch (error) {
            console.error('Error al obtener el dashboard:', error);

            res.status(500).json({
                mensaje: 'Error al obtener los datos del dashboard'
            });
        }
    }
}
