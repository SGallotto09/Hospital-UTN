import { describe, expect, it, vi } from 'vitest'
import { GenerarProtocolo, type MotivoIngreso } from '../../use-cases/protocolos/generar_protocolos.js'
import { PreOpProtocolBuilder } from '../../domain/builders/pre_op_protocol_builder.js'

describe('protocolos de Enfermería integrados', () => {
  it.each([
    ['Prequirurgico', 'Prequirurgico', 3],
    ['Neumonia', 'Respiratorio', 2],
  ] as const)('genera %s y conserva las tareas originales', async (motivo, tipo, tareas) => {
    const repo = { guardar: vi.fn().mockResolvedValue(10), obtenerPorPaciente: vi.fn(), actualizarEstadoTarea: vi.fn() }
    const protocolo = await new GenerarProtocolo(repo).ejecutar(1, motivo)
    expect(protocolo).toMatchObject({ id: 10, id_paciente: 1, tipo_protocolo: tipo })
    expect(protocolo.tareas).toHaveLength(tareas)
    expect(protocolo.tareas.every(tarea => tarea.estado === 'Pendiente')).toBe(true)
    expect(repo.guardar).toHaveBeenCalledExactlyOnceWith(protocolo)
  })

  it('reiniciar el builder no conserva tareas ni paciente de otra generación', () => {
    const builder = new PreOpProtocolBuilder()
    builder.reiniciar(1)
    builder.agregar_tarea('Tarea adicional de prueba')
    builder.reiniciar(2)
    expect(builder.obtener_protocolo().id_paciente).toBe(2)
    expect(builder.obtener_protocolo().tareas).toHaveLength(3)
  })

  it.each([0, -1, 1.5])('rechaza paciente inválido %s sin persistir', async id => {
    const repo = { guardar: vi.fn(), obtenerPorPaciente: vi.fn(), actualizarEstadoTarea: vi.fn() }
    await expect(new GenerarProtocolo(repo).ejecutar(id, 'Prequirurgico')).rejects.toThrow('ID del paciente')
    expect(repo.guardar).not.toHaveBeenCalled()
  })

  it('rechaza un motivo desconocido sin persistir', async () => {
    const repo = { guardar: vi.fn(), obtenerPorPaciente: vi.fn(), actualizarEstadoTarea: vi.fn() }
    await expect(new GenerarProtocolo(repo).ejecutar(1, 'Desconocido' as MotivoIngreso)).rejects.toThrow('motivo de ingreso')
    expect(repo.guardar).not.toHaveBeenCalled()
  })
})
