import type { Request, Response } from 'express';
import { ObtenerMedicaciones } from '../../../use-cases/administracion-medicacion/obtener_medicaciones.js';

export class AdministracionMedicacionController {
    constructor(
        private readonly obtenerMedicaciones: ObtenerMedicaciones
    ) {}

    async obtenerTodas(_req: Request, res: Response): Promise<void> {
        try {
            const medicaciones = await this.obtenerMedicaciones.ejecutar();

            res.status(200).json(medicaciones);
        } catch (error) {
            console.error('Error al obtener las medicaciones:', error);

            res.status(500).json({
                mensaje: 'Error al obtener las medicaciones'
            });
        }
    }
}