import type { Request, Response } from 'express';
import { ObtenerHistoriaClinicaCompleta } from '../../use-cases/obtener_historia_clinica_completa.js';
import { ObtenerEstudiosPorPaciente } from '../../use-cases/obtener_estudios_por_paciente.js';

export class HistoriaCompletaController {
    constructor(
        private readonly obtenerHistoria: ObtenerHistoriaClinicaCompleta,
        private readonly obtenerEstudios: ObtenerEstudiosPorPaciente,
    ) {}

    async obtenerPorPaciente(req: Request, res: Response): Promise<void> {
        const id = Number(req.params.idPaciente);
        if (!Number.isSafeInteger(id) || id <= 0) {
            res.status(400).json({ mensaje: 'El ID del paciente no es válido' });
            return;
        }
        try {
            const historia = await this.obtenerHistoria.ejecutar(id);
            if (!historia) {
                res.status(404).json({ mensaje: 'Paciente no encontrado' });
                return;
            }
            res.status(200).json(historia);
        } catch {
            res.status(500).json({ mensaje: 'Error al obtener la historia clínica' });
        }
    }

    async estudiosPorPaciente(req: Request, res: Response): Promise<void> {
        const id = Number(req.params.idPaciente);
        if (!Number.isSafeInteger(id) || id <= 0) {
            res.status(400).json({ mensaje: 'El ID del paciente no es válido' });
            return;
        }
        try {
            res.status(200).json(await this.obtenerEstudios.ejecutar(id));
        } catch {
            res.status(500).json({ mensaje: 'Error al obtener los estudios clínicos' });
        }
    }
}
