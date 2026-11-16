import { describe, expect, it, vi } from 'vitest'
import { Paciente } from '../../../admicion-turnos/domain/entities/Paciente.js'
import { crearPacienteGatewayAdmision } from '../../infraestructure/crearPacienteGatewayAdmision.js'

describe('gateway de pacientes de Admisión', () => {
  it('busca por DNI y devuelve sólo los cuatro datos necesarios', async () => {
    const paciente = Paciente.reconstituir({
      id: 8, nombre: 'Ana', apellido: 'Prueba', dni: '12345678',
      fechaNacimiento: '2000-01-01', genero: 'Prueba', telefono: '12345678',
      email: 'prueba@example.test', obraSocial: 1,
    })
    const buscarPorDni = vi.fn().mockResolvedValue(paciente)
    const gateway = crearPacienteGatewayAdmision({ buscarPorId: vi.fn(), buscarPorDni })
    await expect(gateway.buscarPorDni('12345678')).resolves.toEqual({
      id: 8, nombre: 'Ana', apellido: 'Prueba', dni: '12345678',
    })
    expect(buscarPorDni).toHaveBeenCalledExactlyOnceWith('12345678')
  })

  it('distingue un DNI inexistente de un error de Admisión', async () => {
    const buscarPorDni = vi.fn().mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('Consulta fallida'))
    const gateway = crearPacienteGatewayAdmision({ buscarPorId: vi.fn(), buscarPorDni })
    await expect(gateway.buscarPorDni('12345678')).resolves.toBeNull()
    await expect(gateway.buscarPorDni('12345678')).rejects.toThrow('Consulta fallida')
  })
  it('reutiliza buscarPorId y reconoce un paciente existente', async () => {
    const paciente = Paciente.reconstituir({
      id: 8, nombre: 'Prueba', apellido: 'Prueba', dni: '12345678',
      fechaNacimiento: '2000-01-01', genero: 'Prueba', telefono: '12345678',
      email: 'prueba@example.test', obraSocial: 1,
    })
    const buscarPorId = vi.fn().mockResolvedValue(paciente)
    await expect(crearPacienteGatewayAdmision({ buscarPorId, buscarPorDni: vi.fn() }).existe(8)).resolves.toBe(true)
    expect(buscarPorId).toHaveBeenCalledExactlyOnceWith(8)
  })

  it('devuelve false cuando Admisión devuelve null', async () => {
    const buscarPorId = vi.fn().mockResolvedValue(null)
    await expect(crearPacienteGatewayAdmision({ buscarPorId, buscarPorDni: vi.fn() }).existe(8)).resolves.toBe(false)
  })

  it('propaga errores de Admisión sin confundirlos con un paciente inexistente', async () => {
    const error = new Error('Fallo de consulta')
    const buscarPorId = vi.fn().mockRejectedValue(error)
    await expect(crearPacienteGatewayAdmision({ buscarPorId, buscarPorDni: vi.fn() }).existe(8)).rejects.toBe(error)
  })
})
