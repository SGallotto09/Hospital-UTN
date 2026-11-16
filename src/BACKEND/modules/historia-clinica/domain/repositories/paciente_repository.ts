import type { Paciente } from '../entities/paciente.js'

export interface PacienteRepository {
  registrar(
    datos: Omit<Paciente, 'id' | 'fecha_nacimiento' | 'obra_social'> & {
      fecha_nacimiento: string
      obra_social: string
    },
  ): Promise<Paciente>

  obtenerTodos(): Promise<Paciente[]>

  obtenerPorId(id: number): Promise<Paciente | null>

  obtenerPorDni(dni: string): Promise<Paciente | null>
}
