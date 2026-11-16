import type { Request, Response } from 'express';
import { RegistrarAntecedenteFamiliar } from '../../use-cases/registrar_antecedente_familiar.js';
import { ObtenerAntecedentesPorPaciente } from '../../use-cases/obtener_antecedentes_por_paciente.js';

export class AntecedenteFamiliarController {
    constructor(
        private readonly registrarAntecedente: RegistrarAntecedenteFamiliar,
        private readonly obtenerAntecedentes: ObtenerAntecedentesPorPaciente
    ){}

    async registrar(req: Request, res: Response): Promise<void> {
        try {
            const antecedente = await this.registrarAntecedente.ejecutar(req.body);
            res.status(201).json(antecedente);
        } catch {
            res.status(400).json({ mensaje: 'No se pudo registrar el antecedente' });
        }
    }

    async obtenerPorPaciente(req: Request, res: Response): Promise<void> {
        const id = Number(req.params.idPaciente);
        if (!Number.isSafeInteger(id) || id <= 0) {
            res.status(400).json({ mensaje: 'El ID del paciente no es válido' });
            return;
        }
        try {
            res.status(200).json(await this.obtenerAntecedentes.ejecutar(id));
        } catch {
            res.status(500).json({ mensaje: 'Error al obtener los antecedentes' });
        }
    }
}
