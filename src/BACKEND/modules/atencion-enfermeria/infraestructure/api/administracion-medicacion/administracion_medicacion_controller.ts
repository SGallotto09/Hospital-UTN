
import type { Request, Response } from 'express';
import { ObtenerMedicaciones } from '../../../use-cases/administracion-medicacion/obtener_medicaciones.js';
import { AdministrarMedicacion } from '../../../use-cases/administracion-medicacion/administrar_medicacion.js';

export class AdministracionMedicacionController {

    constructor(
        private readonly obtener_medicaciones: ObtenerMedicaciones,
        private readonly administracion_medicacion: AdministrarMedicacion
    ) {}

    async obtenerTodas(_req: Request, res: Response): Promise<void> {
        try {
            const medicaciones = await this.obtener_medicaciones.ejecutar();

            res.status(200).json(medicaciones);

        } catch (error) {
            console.error('Error al obtener las medicaciones:', error);

            res.status(500).json({
                mensaje: 'Error al obtener las medicaciones'
            });
        }
    }

    

    async administrar(req: Request, res: Response): Promise<void> {
        try {
            const id_indicacion_medica = Number(req.body.id_indicacion_medica);
            const id_enfermero = Number(req.body.id_enfermero);
            const horario_programado = new Date(req.body.horario_programado);
            const cantidad_administrada = Number(req.body.cantidad_administrada);

            if (
                !Number.isInteger(id_indicacion_medica) ||
                id_indicacion_medica <= 0 ||
                !Number.isInteger(id_enfermero) ||
                id_enfermero <= 0
            ) {
                res.status(400).json({
                    mensaje: 'Los identificadores enviados no son válidos'
                });
                return;
            }

            if (
                !req.body.horario_programado ||
                Number.isNaN(horario_programado.getTime())
            ) {
                res.status(400).json({
                    mensaje: 'El horario programado no es válido'
                });
                return;
            }

            if (
                !Number.isFinite(cantidad_administrada) ||
                cantidad_administrada <= 0
            ) {
                res.status(400).json({
                    mensaje: 'La cantidad administrada debe ser mayor a cero'
                });
                return;
            }

            const id_administracion_medicacion =
                await this.administracion_medicacion.ejecutar(
                    id_indicacion_medica,
                    id_enfermero,
                    horario_programado,
                    cantidad_administrada
                );

            res.status(200).json({
                mensaje: 'Medicación administrada correctamente',
                idAdministracionMedicacion: id_administracion_medicacion,
                cantidadAdministrada: cantidad_administrada
            });

        } catch (error) {
            const mensaje = error instanceof Error
                ? error.message
                : 'Error al administrar la medicación';

            res.status(400).json({ mensaje });
        }
    }


}
