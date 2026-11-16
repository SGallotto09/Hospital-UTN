import { Database } from '../../../../database/connectionDB.js'

import type { PacienteRepository } from '../../domain/repositories/paciente_repository.js'
import type { Paciente } from '../../domain/entities/paciente.js'

export class PacienteRepositoryMySQL implements PacienteRepository {
  private readonly db = Database.getInstance()

  async registrar(
    datos: Omit<Paciente, 'id' | 'fecha_nacimiento' | 'obra_social'> & {
      fecha_nacimiento: string
      obra_social: string
    },
  ): Promise<Paciente> {
    const [resultado] = await this.db.query(
      `INSERT INTO pacientes (nombre, apellido, dni, fecha_nacimiento, genero, telefono, email, obra_social)
             SELECT ?, ?, ?, ?, ?, ?, ?, id FROM obras_sociales WHERE nombre = ?`,
      [
        datos.nombre,
        datos.apellido,
        datos.dni,
        datos.fecha_nacimiento,
        datos.genero,
        datos.telefono,
        datos.email,
        datos.obra_social,
      ],
    )
    const insertado = resultado as { insertId?: number }
    if (!insertado.insertId) throw new Error('La cobertura médica indicada no existe.')
    const paciente = await this.obtenerPorId(insertado.insertId)
    if (!paciente) throw new Error('No se pudo recuperar el paciente registrado.')
    return paciente
  }

  async obtenerTodos(): Promise<Paciente[]> {
    const [filas] = await this.db.query(
      `SELECT p.*, DATE_FORMAT(p.fecha_nacimiento, '%Y-%m-%d') AS fecha_nacimiento, o.nombre AS cobertura_nombre FROM pacientes p JOIN obras_sociales o ON o.id = p.obra_social`,
    )

    return filas as Paciente[]
  }

  async obtenerPorId(id: number): Promise<Paciente | null> {
    const [filas] = await this.db.query(
      "SELECT p.*, DATE_FORMAT(p.fecha_nacimiento, '%Y-%m-%d') AS fecha_nacimiento, o.nombre AS cobertura_nombre FROM pacientes p JOIN obras_sociales o ON o.id = p.obra_social WHERE p.id = ?",
      [id],
    )

    const pacientes = filas as Paciente[]

    return pacientes.length > 0 ? pacientes[0]! : null
  }

  async obtenerPorDni(dni: string): Promise<Paciente | null> {
    const [filas] = await this.db.query(
      "SELECT p.*, DATE_FORMAT(p.fecha_nacimiento, '%Y-%m-%d') AS fecha_nacimiento, o.nombre AS cobertura_nombre FROM pacientes p JOIN obras_sociales o ON o.id = p.obra_social WHERE p.dni = ? LIMIT 1",
      [dni],
    )

    const pacientes = filas as Paciente[]

    return pacientes.length > 0 ? pacientes[0]! : null
  }
}
