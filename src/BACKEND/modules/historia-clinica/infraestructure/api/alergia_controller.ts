import type { Request, Response } from 'express';

import { RegistrarAlergia } from '../../use-cases/registrar_alergia.js';
import { ObtenerAlergiasPorPaciente } from '../../use-cases/obtener_alergias_por_paciente.js';

import { responderErrorClinico } from './responder_error_clinico.js';

export class AlergiaController {
    constructor(
        private readonly registrarAlergia: RegistrarAlergia,
        private readonly obtenerAlergias: ObtenerAlergiasPorPaciente,
    ) {}

    async registrar(req: Request, res: Response): Promise<void> {
        if (!req.session.usuarioId) {
            res.status(401).json({ mensaje: 'Debe iniciar sesion.' });
            return;
        }
        try {
            const datos = req.body ?? {};
            const fechaTexto = datos.fecha_deteccion;
            if (typeof fechaTexto !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fechaTexto))
                throw new TypeError('Fecha de deteccion invalida.');
            const fecha = new Date(fechaTexto + 'T00:00:00');
            if (
                Number.isNaN(fecha.getTime()) ||
                [
                    fecha.getFullYear(),
                    String(fecha.getMonth() + 1).padStart(2, '0'),
                    String(fecha.getDate()).padStart(2, '0'),
                ].join('-') !== fechaTexto
            )
                throw new TypeError('Fecha de deteccion invalida.');
            const registro = await this.registrarAlergia.ejecutar({
                id_paciente: datos.id_paciente,
                sustancia: datos.sustancia,
                reaccion: datos.reaccion,
                gravedad: datos.gravedad,
                estado: 'activa',
                fecha_deteccion: fecha,
                id_medico: req.session.usuarioId,
            });
            res.status(201).json(registro);
        } catch (error) {
            responderErrorClinico(res, error);
        }
    }

    async obtenerPorPaciente(req: Request, res: Response): Promise<void> {
        try {
            const idPaciente = Number(req.params.idPaciente);

            if (!Number.isSafeInteger(idPaciente) || idPaciente <= 0) {
                res.status(400).json({
                    mensaje: 'El ID del paciente no es válido',
                });
                return;
            }

            const alergias = await this.obtenerAlergias.ejecutar(idPaciente);

            res.status(200).json(alergias);
        } catch (error) {
            res.status(500).json({
                mensaje: 'Error al obtener las alergias',
            });
        }
    }
}
