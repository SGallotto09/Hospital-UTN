import type { IPacienteRepository } from '../../admicion-turnos/domain/repositories/IPacienteRepository.js'
import type { IPacienteGateway } from '../application/ports/IPacienteGateway.js'

export function crearPacienteGatewayAdmision(
  pacientes: Pick<IPacienteRepository, 'buscarPorId' | 'buscarPorDni'>,
): IPacienteGateway {
  return {
    async existe(idPaciente) {
      return (await pacientes.buscarPorId(idPaciente)) !== null
    },
    async buscarPorDni(dni) {
      const paciente = await pacientes.buscarPorDni(dni)
      if (!paciente) return null
      if (paciente.id === null) throw new Error('Admisión devolvió un paciente sin ID.')
      return { id: paciente.id, nombre: paciente.nombre, apellido: paciente.apellido, dni: paciente.dni }
    },
  }
}
