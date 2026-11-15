import type { Request, Response } from 'express';
import { ObtenerPacientesInternados } from '../../../use-cases/pacientes-internados/obtener_pacientes_internados.js';

export class PacienteInternadoController {
    constructor(
        private readonly obtenerPacientesInternados: ObtenerPacientesInternados
    ) {}

    async obtenerTodos(req: Request, res: Response): Promise<void> {
        try {
            const buscar = typeof req.query.buscar === 'string' ? req.query.buscar : undefined;
            
            const pacientes = await this.obtenerPacientesInternados.ejecutar(buscar);
            res.status(200).json(pacientes);
        } catch (error) {
            console.error('Error al obtener los pacientes internados:', error);
            res.status(500).json({
                mensaje: 'Error al obtener los pacientes internados'
            });
        }
    }
}