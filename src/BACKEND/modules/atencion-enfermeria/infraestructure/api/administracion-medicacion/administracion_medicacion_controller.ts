
import type { Request, Response } from 'express';
import { ObtenerMedicaciones } from '../../../use-cases/administracion-medicacion/obtener_medicaciones.js';
import { AdministrarMedicacion } from '../../../use-cases/administracion-medicacion/administrar_medicacion.js';
import { ErrorEnfermeria } from '../../../domain/errors/error_enfermeria.js';
import { GestionarIndicaciones } from '../../../use-cases/administracion-medicacion/gestionar_indicaciones.js';

export class AdministracionMedicacionController {

    constructor(
        private readonly obtener_medicaciones: ObtenerMedicaciones,
        private readonly administracion_medicacion: AdministrarMedicacion,
        private readonly gestionar_indicaciones?: GestionarIndicaciones
    ) {}

    obtenerPermisos(req: Request, res: Response): void {
        res.status(200).json({ puedeCrearIndicacion: req.session?.rol === 'Médico' });
    }

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

    async obtenerOpcionesIndicacion(_req: Request, res: Response): Promise<void> {
        try {
            if (!this.gestionar_indicaciones) throw new Error('Gestión de indicaciones no disponible.');
            res.status(200).json(await this.gestionar_indicaciones.obtenerOpciones());
        } catch (error) {
            console.error('Error al cargar opciones de indicación:', error);
            res.status(500).json({ mensaje: 'No se pudieron cargar pacientes e insumos.' });
        }
    }

    async crearIndicacion(req: Request, res: Response): Promise<void> {
        const id_medico = req.session?.usuarioId;
        if (typeof id_medico !== 'number' || !Number.isSafeInteger(id_medico) || id_medico <= 0) {
            res.status(401).json({ mensaje: 'Debes iniciar sesión.' });
            return;
        }

        try {
            if (!this.gestionar_indicaciones) throw new Error('Gestión de indicaciones no disponible.');
            const datos = req.body ?? {};
            const id = await this.gestionar_indicaciones.crear({
                id_medico,
                id_paciente: Number(datos.id_paciente),
                id_insumo: Number(datos.id_insumo),
                cantidad: Number(datos.cantidad),
                fecha: String(datos.fecha ?? ''),
                hora_inicio: String(datos.hora_inicio ?? ''),
                frecuencia_horas: Number(datos.frecuencia_horas),
            });
            res.status(201).json({ mensaje: 'Indicación médica creada correctamente.', id });
        } catch (error) {
            const status = error instanceof ErrorEnfermeria ? error.estado_http : 500;
            if (status === 500) console.error('Error al crear indicación médica:', error);
            res.status(status).json({
                mensaje: error instanceof ErrorEnfermeria ? error.message : 'No se pudo crear la indicación médica.',
            });
        }
    }

    async obtenerHistorial(_req: Request, res: Response): Promise<void> {
        try {
            if (!this.gestionar_indicaciones) throw new Error('Gestión de indicaciones no disponible.');
            res.status(200).json(await this.gestionar_indicaciones.obtenerHistorial());
        } catch (error) {
            console.error('Error al obtener historial de medicación:', error);
            res.status(500).json({ mensaje: 'No se pudo cargar el historial.' });
        }
    }


    async administrar(req: Request, res: Response): Promise<void> {
        const id_enfermero = req.session?.usuarioId;
        if (typeof id_enfermero !== 'number' || !Number.isSafeInteger(id_enfermero) || id_enfermero <= 0) {
            res.status(401).json({ mensaje: 'Debes iniciar sesión' });
            return;
        }

        try {
            const id_indicacion_medica = Number(req.body?.id_indicacion_medica);
            const horario_programado = new Date(req.body?.horario_programado);
            const cantidad_administrada = req.body?.cantidad_administrada;

            if (cantidad_administrada !== undefined &&
                (typeof cantidad_administrada !== 'number' ||
                 !Number.isSafeInteger(cantidad_administrada) || cantidad_administrada <= 0)) {
                res.status(400).json({ mensaje: 'La cantidad administrada debe ser un entero positivo' });
                return;
            }

            if (!Number.isSafeInteger(id_indicacion_medica) || id_indicacion_medica <= 0) {
                res.status(400).json({ mensaje: 'El ID de la indicación médica no es válido' });
                return;
            }

            if (!req.body?.horario_programado || Number.isNaN(horario_programado.getTime())) {
                res.status(400).json({ mensaje: 'El horario programado no es válido' });
                return;
            }

            const idAdministracionMedicacion = await this.administracion_medicacion.ejecutar(
                id_indicacion_medica,
                id_enfermero,
                horario_programado,
                cantidad_administrada
            );

            res.status(201).json({
                mensaje: 'Medicación registrada. El consumo de inventario se procesará automáticamente.',
                idAdministracionMedicacion,
                cantidadAdministrada: cantidad_administrada
            });

        } catch (error) {
            const es_error_enfermeria = error instanceof ErrorEnfermeria;
            const mensaje = es_error_enfermeria
                ? error.message
                : 'Error al administrar la medicación';

            const estado_http = error instanceof ErrorEnfermeria ? error.estado_http : 500;
            if (estado_http === 500) console.error('Error al administrar la medicación:', error);
            res.status(estado_http).json({ mensaje });
        }
    }
}
