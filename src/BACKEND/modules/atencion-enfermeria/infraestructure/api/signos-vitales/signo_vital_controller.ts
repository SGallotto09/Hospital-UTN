import type { Request, Response } from 'express';
import { RegistrarSignoVital } from '../../../use-cases/signos-vitales/registrar_signo_vital.js';
import { ObtenerSignosVitales } from '../../../use-cases/signos-vitales/obtener_signos_vitales.js';
import { ObtenerSingosVitalesPorPacientes } from '../../../use-cases/signos-vitales/obetener_signos_vitales_por_pacientes.js';
import type { SignoVital } from '../../../domain/entities/signos_vitales.js';
import { ErrorEnfermeria } from '../../../domain/errors/error_enfermeria.js';

export class SignoVitalController {
    constructor(
        private readonly registrarSignoVital: RegistrarSignoVital,
        private readonly obtenerSignoVital: ObtenerSignosVitales,
        private readonly obtenerSingoVitalPorPaciente: ObtenerSingosVitalesPorPacientes
    ) {}

    async registrar(req: Request, res: Response): Promise<void> {
        const id_enfermero = req.session?.usuarioId;
        if (typeof id_enfermero !== 'number' || !Number.isSafeInteger(id_enfermero) || id_enfermero <= 0) {
            res.status(401).json({ mensaje: 'Debes iniciar sesión' });
            return;
        }

        try {
            const datos: Omit<SignoVital, 'id' | 'fecha_hora'> = {
                id_paciente: req.body?.id_paciente,
                id_enfermero,
                presion_arterial: req.body?.presion_arterial,
                frecuencia_cardiaca: req.body?.frecuencia_cardiaca,
                temperatura: req.body?.temperatura
            };
            const resultado = await this.registrarSignoVital.ejecutar(datos);

            res.status(201).json(resultado);
        } catch (error) {
            if (error instanceof ErrorEnfermeria) {
                res.status(error.estado_http).json({ mensaje: error.message });
            } else {
                console.error('Error interno al registrar el signo vital:', error);
                res.status(500).json({ mensaje: 'Error al registrar el signo vital' });
            }
        }
    }

    async obtenerTodos(_req: Request, res: Response): Promise<void> {
        try {
            const signosVitales = await this.obtenerSignoVital.ejecutar();
            res.status(200).json(signosVitales);
        } catch (error) {
            res.status(500).json({
                mensaje: 'Error al obtener los signos vitales'
            });
        }
    }

    async obtenerPorPaciente(req: Request, res: Response): Promise<void> {
        try {
            const idPaciente = Number(req.params.idPaciente);

            if (!Number.isInteger(idPaciente) || idPaciente <= 0) {
                res.status(400).json({
                    mensaje: 'El ID del paciente no es válido'
                });
                return;
            }

            const signosVitales =
                await this.obtenerSingoVitalPorPaciente.ejecutar(idPaciente);

            res.status(200).json(signosVitales);
        } catch (error) {
            res.status(500).json({
                mensaje: 'Error al obtener los signos vitales del paciente'
            });
        }
    }
}
