import type { Request, Response } from 'express';

import { RegistrarAlergia } from '../../use-cases/registrar_alergia.js';
import { ObtenerAlergiasPorPaciente } from '../../use-cases/obtener_alergias_por_paciente.js';

export class AlergiaController {
    constructor(
        private readonly registrarAlergia: RegistrarAlergia,
        private readonly obtenerAlergias: ObtenerAlergiasPorPaciente
    ){}

    async registrar(req: Request, res: Response): Promise<void> {
        try {
            const datos = req.body;

            const fecha = new Date(datos?.fecha_deteccion);

            const alergia = await this.registrarAlergia.ejecutar({
                id_paciente: datos?.id_paciente,
                sustancia: datos?.sustancia,
                reaccion: datos?.reaccion,
                gravedad: datos?.gravedad,
                fecha_deteccion: fecha,
                estado: datos?.estado,
                id_medico: datos?.id_medico
            });

            res.status(201).json(alergia);
        } catch (error) {
            res.status(400).json({
                mensaje: error instanceof Error
                    ? error.message
                    : 'Error al registrar la alergia'
            });
        }
    }

    async obtenerPorPaciente(req: Request, res: Response): Promise<void> {
        try {
            const idPaciente = Number(req.params.idPaciente);

            if (!Number.isSafeInteger(idPaciente) || idPaciente <= 0) {
                res.status(400).json({
                    mensaje: 'El ID del paciente no es válido'
                });
                return;
            }

            const alergias = await this.obtenerAlergias.ejecutar(idPaciente);

            res.status(200).json(alergias);
        } catch (error) {
            res.status(500).json({
                mensaje: 'Error al obtener las alergias'
            });
        }
    }
}