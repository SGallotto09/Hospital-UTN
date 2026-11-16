
import type { Request, Response } from 'express';
import {
    generar_protocolo_use_case,
    protocolo_repository
} from './protocolo_atencion_dependencies.js';

export class ProtocoloAtencionController {

    async generar(req: Request, res: Response): Promise<void> {
        try {
            const id_paciente = Number(req.body.id_paciente);
            const motivo_ingreso = req.body.motivo_ingreso;

            if (
                motivo_ingreso !== 'Prequirurgico' &&
                motivo_ingreso !== 'Neumonia'
            ) {
                res.status(400).json({
                    mensaje: 'El motivo de ingreso no es válido.'
                });
                return;
            }

            const protocolo = await generar_protocolo_use_case.ejecutar(
                id_paciente,
                motivo_ingreso
            );

            res.status(201).json({
                mensaje: 'Protocolo generado correctamente.',
                protocolo
            });

        } catch (error) {
            console.error('Error al generar protocolo:', error);

            res.status(500).json({
                mensaje: error instanceof Error
                    ? error.message
                    : 'Error interno al generar el protocolo.'
            });
        }
    }

    async obtenerPorPaciente(req: Request, res: Response): Promise<void> {
        try {
            const id_paciente = Number(req.params.idPaciente);

            if (!Number.isSafeInteger(id_paciente) || id_paciente <= 0) {
                res.status(400).json({
                    mensaje: 'El ID del paciente no es válido.'
                });
                return;
            }

            const protocolos = await protocolo_repository.obtenerPorPaciente(id_paciente);

            res.status(200).json({ protocolos });

        } catch (error) {
            console.error('Error al obtener protocolos:', error);

            res.status(500).json({
                mensaje: 'Error al obtener los protocolos del paciente.'
            });
        }
    }

    async actualizarEstadoTarea(req: Request, res: Response): Promise<void> {
        try {
            const id_tarea = Number(req.params.idTarea);
            const estado = req.body.estado;

            if (!Number.isSafeInteger(id_tarea) || id_tarea <= 0) {
                res.status(400).json({
                    mensaje: 'El ID de la tarea no es válido.'
                });
                return;
            }

            if (estado !== 'Pendiente' && estado !== 'Completada') {
                res.status(400).json({
                    mensaje: 'El estado de la tarea no es válido.'
                });
                return;
            }

            await protocolo_repository.actualizarEstadoTarea(id_tarea, estado);

            res.status(200).json({
                mensaje: 'Estado de la tarea actualizado correctamente.'
            });

        } catch (error) {
            console.error('Error al actualizar tarea:', error);

            res.status(500).json({
                mensaje: 'Error al actualizar el estado de la tarea.'
            });
        }
    }
}

export const protocolo_atencion_controller = new ProtocoloAtencionController();
