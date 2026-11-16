import type { Request, Response } from 'express'

import { RegistrarAlergia } from '../../use-cases/registrar_alergia.js'
import { ObtenerAlergiasPorPaciente } from '../../use-cases/obtener_alergias_por_paciente.js'

export class AlergiaController {
  constructor(
    private readonly registrarAlergia: RegistrarAlergia,
    private readonly obtenerAlergias: ObtenerAlergiasPorPaciente,
  ) {}

  async registrar(req: Request, res: Response): Promise<void> {
    const idMedico = req.session.usuarioId
    if (!idMedico) {
      res.status(401).json({ mensaje: 'Debes iniciar sesión' })
      return
    }
    try {
      const datos = req.body

      const fecha = new Date(datos?.fecha_deteccion)

      const alergia = await this.registrarAlergia.ejecutar({
        id_paciente: datos?.id_paciente,
        sustancia: datos?.sustancia,
        reaccion: datos?.reaccion,
        gravedad: datos?.gravedad,
        fecha_deteccion: fecha,
        estado: datos?.estado,
        id_medico: idMedico,
      })

      res.status(201).json(alergia)
    } catch (error) {
      const codigo = error && typeof error === 'object' && 'code' in error ? error.code : undefined

      if (codigo === 'ER_NO_REFERENCED_ROW_2') {
        res.status(400).json({
          mensaje: 'El paciente o el profesional asociado no existe en la base de datos.',
        })
        return
      }

      if (error instanceof Error && !('code' in error)) {
        res.status(400).json({ mensaje: error.message })
        return
      }

      console.error('Error al guardar la alergia en MySQL', error)
      res.status(500).json({ mensaje: 'No se pudo guardar la alergia en la base de datos.' })
    }
  }

  async obtenerPorPaciente(req: Request, res: Response): Promise<void> {
    try {
      const idPaciente = Number(req.params.idPaciente)

      if (!Number.isSafeInteger(idPaciente) || idPaciente <= 0) {
        res.status(400).json({
          mensaje: 'El ID del paciente no es válido',
        })
        return
      }

      const alergias = await this.obtenerAlergias.ejecutar(idPaciente)

      res.status(200).json(alergias)
    } catch (error) {
      res.status(500).json({
        mensaje: 'Error al obtener las alergias',
      })
    }
  }
}
