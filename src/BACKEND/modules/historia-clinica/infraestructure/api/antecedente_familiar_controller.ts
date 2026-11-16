import type { Request, Response } from 'express';
import { RegistrarAntecedenteFamiliar } from '../../use-cases/registrar_antecedente_familiar.js';
import { ObtenerAntecedentesPorPaciente } from '../../use-cases/obtener_antecedentes_por_paciente.js';

import { responderErrorClinico } from './responder_error_clinico.js';

export class AntecedenteFamiliarController {
    constructor(
        private readonly registrarAntecedente: RegistrarAntecedenteFamiliar,
        private readonly obtenerAntecedentes: ObtenerAntecedentesPorPaciente,
    ) {}

    async registrar(req: Request, res: Response): Promise<void> {
        if (!req.session.usuarioId) {
            res.status(401).json({ mensaje: 'Debe iniciar sesion.' });
            return;
        }
        try {
            const datos = req.body ?? {};

            const registro = await this.registrarAntecedente.ejecutar({
                id_paciente: datos.id_paciente,
                parentesco: datos.parentesco,
                enfermedad: datos.enfermedad,
                observaciones: datos.observaciones,
                id_medico: req.session.usuarioId,
            });
            res.status(201).json(registro);
        } catch (error) {
            responderErrorClinico(res, error);
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
