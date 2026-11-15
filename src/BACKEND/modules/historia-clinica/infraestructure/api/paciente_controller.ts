
import type { Request, Response } from 'express';

import { ObtenerPacientes } from '../../use-cases/obtener_pacientes.js';
import { ObtenerPacientePorId } from '../../use-cases/obtener_paciente_por_id.js';
import { ObtenerPacientePorDni } from '../../use-cases/obtener_paciente_por_dni.js';

export class PacienteController {
    constructor(
        private readonly obtenerPacientes: ObtenerPacientes,
        private readonly obtenerPacientePorId: ObtenerPacientePorId,
        private readonly obtenerPacientePorDni: ObtenerPacientePorDni
    ){}

    async obtenerTodos(_req: Request, res: Response): Promise<void> {
        try {
            const pacientes = await this.obtenerPacientes.ejecutar();

            res.status(200).json(pacientes);
        } catch (error) {
            res.status(500).json({
                mensaje: 'Error al obtener los pacientes'
            });
        }
    }

    async obtenerPorId(req: Request, res: Response): Promise<void> {
        try {
            const id = Number(req.params.id);

            if (!Number.isSafeInteger(id) || id <= 0) {
                res.status(400).json({
                    mensaje: 'El ID del paciente no es válido'
                });
                return;
            }

            const paciente = await this.obtenerPacientePorId.ejecutar(id);

            if (!paciente) {
                res.status(404).json({
                    mensaje: 'Paciente no encontrado'
                });
                return;
            }

            res.status(200).json(paciente);
        } catch (error) {
            res.status(500).json({
                mensaje: 'Error al obtener el paciente'
            });
        }
    }

    async obtenerPorDni(req: Request, res: Response): Promise<void> {
        try {
            const dni = req.params.dni;

            if (typeof dni !== 'string' || !dni.trim()) {
                res.status(400).json({
                    mensaje: 'El DNI del paciente no es válido'
                });
                return;
            }

            const paciente = await this.obtenerPacientePorDni.ejecutar(dni);

            if (!paciente) {
                res.status(404).json({
                    mensaje: 'Paciente no encontrado'
                });
                return;
            }

            res.status(200).json(paciente);
        } catch (error) {
            res.status(500).json({
                mensaje: 'Error al buscar el paciente por DNI'
            });
        }
    }
}
