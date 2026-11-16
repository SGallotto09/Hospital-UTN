import type { Request, Response } from 'express'
import { RegistrarEvolucionMedica } from '../../use-cases/registrar_evolucion_medica.js'
import { ObtenerEvolucionesPorPaciente } from '../../use-cases/obtener_evoluciones_por_paciente.js'

export class EvolucionMedicaController {
  constructor(
    private readonly registrarEvolucion: RegistrarEvolucionMedica,
    private readonly obtenerEvoluciones: ObtenerEvolucionesPorPaciente,
  ) {}

  async registrar(req: Request, res: Response): Promise<void> {
    if (!req.session.usuarioId) {
      res.status(401).json({ mensaje: 'Debes iniciar sesión' })
      return
    }
    try {
      res.status(201).json(
        await this.registrarEvolucion.ejecutar({
          ...req.body,
          id_medico: req.session.usuarioId,
        }),
      )
    } catch {
      res.status(400).json({ mensaje: 'No se pudo registrar la evolución' })
    }
  }

  async obtenerPorPaciente(req: Request, res: Response): Promise<void> {
    const id = Number(req.params.idPaciente)
    if (!Number.isSafeInteger(id) || id <= 0) {
      res.status(400).json({ mensaje: 'El ID del paciente no es válido' })
      return
    }
    try {
      res.status(200).json(await this.obtenerEvoluciones.ejecutar(id))
    } catch {
      res.status(500).json({ mensaje: 'Error al obtener las evoluciones' })
    }
  }
}
