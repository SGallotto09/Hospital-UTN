import type { Request, Response } from 'express'

import { ObtenerPacientes } from '../../use-cases/obtener_pacientes.js'
import { ObtenerPacientePorId } from '../../use-cases/obtener_paciente_por_id.js'
import { ObtenerPacientePorDni } from '../../use-cases/obtener_paciente_por_dni.js'
import type { PacienteRepository } from '../../domain/repositories/paciente_repository.js'

export class PacienteController {
  constructor(
    private readonly obtenerPacientes: ObtenerPacientes,
    private readonly obtenerPacientePorId: ObtenerPacientePorId,
    private readonly obtenerPacientePorDni: ObtenerPacientePorDni,
    private readonly registrarPaciente: PacienteRepository,
  ) {}

  async obtenerTodos(_req: Request, res: Response): Promise<void> {
    try {
      const pacientes = await this.obtenerPacientes.ejecutar()

      res.status(200).json(pacientes)
    } catch (error) {
      res.status(500).json({
        mensaje: 'Error al obtener los pacientes',
      })
    }
  }

  async registrar(req: Request, res: Response): Promise<void> {
    try {
      const { nombre, apellido, dni, fechaNacimiento, genero, telefono, email, obraSocial } =
        req.body ?? {}
      if (
        ![nombre, apellido, dni, fechaNacimiento, genero, telefono, email, obraSocial].every(
          (valor) => typeof valor === 'string' && valor.trim(),
        )
      ) {
        res.status(400).json({ mensaje: 'Todos los datos del paciente son obligatorios.' })
        return
      }
      const paciente = await this.registrarPaciente.registrar({
        nombre,
        apellido,
        dni,
        fecha_nacimiento: fechaNacimiento,
        genero,
        telefono,
        email,
        obra_social: obraSocial,
      })
      res.status(201).json(paciente)
    } catch (error) {
      const codigo = error && typeof error === 'object' && 'code' in error ? error.code : undefined
      if (codigo === 'ER_DUP_ENTRY') {
        res.status(409).json({ mensaje: 'Ya existe un paciente con ese DNI.' })
        return
      }
      if (error instanceof Error && error.message === 'La cobertura médica indicada no existe.') {
        res.status(400).json({ mensaje: error.message })
        return
      }
      console.error('Error al registrar el paciente', error)
      res.status(500).json({ mensaje: 'Error interno al registrar el paciente.' })
    }
  }

  async obtenerPorId(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id)

      if (!Number.isSafeInteger(id) || id <= 0) {
        res.status(400).json({
          mensaje: 'El ID del paciente no es válido',
        })
        return
      }

      const paciente = await this.obtenerPacientePorId.ejecutar(id)

      if (!paciente) {
        res.status(404).json({
          mensaje: 'Paciente no encontrado',
        })
        return
      }

      res.status(200).json(paciente)
    } catch (error) {
      res.status(500).json({
        mensaje: 'Error al obtener el paciente',
      })
    }
  }

  async obtenerPorDni(req: Request, res: Response): Promise<void> {
    try {
      const dni = req.params.dni

      if (typeof dni !== 'string' || !dni.trim()) {
        res.status(400).json({
          mensaje: 'El DNI del paciente no es válido',
        })
        return
      }

      const paciente = await this.obtenerPacientePorDni.ejecutar(dni)

      if (!paciente) {
        res.status(404).json({
          mensaje: 'Paciente no encontrado',
        })
        return
      }

      res.status(200).json(paciente)
    } catch (error) {
      res.status(500).json({
        mensaje: 'Error al buscar el paciente por DNI',
      })
    }
  }
}
