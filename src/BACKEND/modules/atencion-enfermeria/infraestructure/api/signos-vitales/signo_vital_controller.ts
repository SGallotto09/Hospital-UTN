import type { Request, Response } from 'express';
import { RegistrarSignoVital } from '../../../use-cases/signos-vitales/registrar_signo_vital.js';
import { ObtenerSignosVitales } from '../../../use-cases/signos-vitales/obtener_signos_vitales.js';
import { ObtenerSingosVitalesPorPacientes } from '../../../use-cases/signos-vitales/obetener_signos_vitales_por_pacientes.js';
export class SignoVitalController{
    constructor(
        private readonly registrarSignoVital: RegistrarSignoVital,
        private readonly obtenerSignoVital: ObtenerSignosVitales,
        private readonly obtenerSingoVitalPorPaciente: ObtenerSingosVitalesPorPacientes
    ){}

    async registrar(req: Request, res: Response): Promise<void>{
        try{
            const signoVital = await this.registrarSignoVital.ejecutar(req.body);
            res.status(201).json(signoVital);
        }catch(error){
            res.status(400).json({
                mensaje: error instanceof Error ? error.message: 'Error al registrar el signo vital'
            });
        }
    }

    async obtenerTodos(_req: Request, res: Response): Promise<void>{
        try{
            const signosVitales = await this.obtenerSignoVital.ejecutar();
            res.status(201).json(signosVitales);
        }catch(error){
            res.status(400).json({
                mensaje: 'Error al obtener los signos vitales'
            });
        }
    }
    
    async obtenerPorPaciente(req: Request, res: Response): Promise<void>{
        try{
            const idPaciente = Number(req.params.idPaciente);

            if(!Number.isInteger(idPaciente) || idPaciente <= 0){
                res.status(400).json({mensaje: 'El ID del paciente no es válido'});
                return;
            }

            const signosVitales = await this.obtenerSingoVitalPorPaciente.ejecutar(idPaciente);
            res.status(201).json(signosVitales);
        }catch(error){
            res.status(400).json({
                mensaje: 'Error al obtener los signos vitales del paciente'
            });
        }
    }
}