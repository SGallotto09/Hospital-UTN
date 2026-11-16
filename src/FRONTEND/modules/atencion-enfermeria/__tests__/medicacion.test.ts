// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import MedicacionView from '../views/MedicacionView.vue'

const dosis = {
  id_indicacion_medica: 1, id_paciente: 1, nombre: 'Paciente', apellido: 'Prueba',
  habitacion: 101, medicamento: 'Insumo de prueba', cantidad: 2,
  horario_programado: '2026-11-16T15:32:35-03:00', estado: 'Pendiente',
}

afterEach(() => vi.unstubAllGlobals())

function prepararFetch() {
  const solicitar = vi.fn<typeof fetch>().mockImplementation(async (_url, opciones) => new Response(
    JSON.stringify(opciones?.method === 'POST'
      ? { mensaje: 'Registrada; inventario pendiente', idAdministracionMedicacion: 20, cantidadAdministrada: 2 }
      : [dosis]),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  ))
  vi.stubGlobal('fetch', solicitar)
  return solicitar
}

describe('medicación integrada con unidades de inventario', () => {
  it('precarga la cantidad indicada y envía un entero con las cookies de sesión', async () => {
    const solicitar = prepararFetch()
    const wrapper = mount(MedicacionView)
    await flushPromises()
    expect(wrapper.get<HTMLInputElement>('input[type="number"]').element.value).toBe('2')
    expect(wrapper.get('input[type="number"]').attributes('step')).toBe('1')
    await wrapper.get('.admin-button').trigger('click')
    await flushPromises()
    const escrituras = solicitar.mock.calls.filter(([, opciones]) => opciones?.method === 'POST')
    expect(escrituras).toHaveLength(1)
    expect(escrituras[0]?.[0]).toBe('/api/administracion-medicacion')
    expect(escrituras[0]?.[1]?.credentials).toBe('include')
    expect(JSON.parse(String(escrituras[0]?.[1]?.body))).toEqual({
      id_indicacion_medica: 1, horario_programado: dosis.horario_programado, cantidad_administrada: 2,
    })
    wrapper.unmount()
  })

  it.each(['0', '-1', '1.5', '1', '3'])('no envía cantidad inválida o diferente de la indicada: %s', async cantidad => {
    const solicitar = prepararFetch()
    const wrapper = mount(MedicacionView)
    await flushPromises()
    await wrapper.get('input[type="number"]').setValue(cantidad)
    await wrapper.get('.admin-button').trigger('click')
    await flushPromises()
    expect(solicitar.mock.calls.some(([, opciones]) => opciones?.method === 'POST')).toBe(false)
    expect(wrapper.text()).toContain('entera, positiva e igual a la indicada')
    wrapper.unmount()
  })
})
