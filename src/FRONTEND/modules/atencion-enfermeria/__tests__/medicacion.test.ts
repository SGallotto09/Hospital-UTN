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
  const solicitar = vi.fn<typeof fetch>().mockImplementation(async (url, opciones) => {
    const ruta = String(url)
    const datos = opciones?.method === 'POST'
      ? { mensaje: 'Registrada; inventario pendiente', idAdministracionMedicacion: 20, cantidadAdministrada: 2 }
      : ruta.endsWith('/permisos') ? { puedeCrearIndicacion: false }
      : ruta.endsWith('/historial') ? []
      : ruta.endsWith('/opciones-indicacion') ? { mensaje: 'No autorizado' }
      : [dosis]
    return new Response(JSON.stringify(datos), {
      status: ruta.endsWith('/opciones-indicacion') ? 403 : 200,
      headers: { 'Content-Type': 'application/json' },
    })
  })
  vi.stubGlobal('fetch', solicitar)
  return solicitar
}

describe('medicación integrada con unidades de inventario', () => {
  it('precarga la cantidad indicada y envía un entero con las cookies de sesión', async () => {
    const solicitar = prepararFetch()
    const wrapper = mount(MedicacionView)
    await flushPromises()
    expect(wrapper.find('.new-order').exists()).toBe(false)
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

  it('muestra el alta solo cuando la API autoriza al médico y crea una indicación', async () => {
    const solicitar = vi.fn<typeof fetch>().mockImplementation(async (url, opciones) => {
      const ruta = String(url)
      const datos = opciones?.method === 'POST'
        ? { mensaje: 'Indicación médica creada correctamente.', id: 9 }
        : ruta.endsWith('/permisos') ? { puedeCrearIndicacion: true }
        : ruta.endsWith('/historial') ? []
        : ruta.endsWith('/opciones-indicacion')
          ? { pacientes: [{ id: 3, nombre: 'Ana', apellido: 'Prueba' }], insumos: [{ id: 5, nombre: 'Paracetamol' }] }
          : [dosis]
      return new Response(JSON.stringify(datos), { status: 200, headers: { 'Content-Type': 'application/json' } })
    })
    vi.stubGlobal('fetch', solicitar)
    const wrapper = mount(MedicacionView)
    await flushPromises()
    await wrapper.get('.new-order').trigger('click')
    await wrapper.get('select').setValue('3')
    await wrapper.findAll('select')[1]!.setValue('5')
    const campos = wrapper.findAll('input')
    await campos[0]!.setValue('2')
    await campos[1]!.setValue('2026-12-01')
    await campos[2]!.setValue('08:30')
    await campos[3]!.setValue('6')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    const alta = solicitar.mock.calls.find(([, opciones]) => opciones?.method === 'POST')
    expect(alta?.[0]).toBe('/api/administracion-medicacion/indicaciones')
    expect(JSON.parse(String(alta?.[1]?.body))).toEqual({ id_paciente: 3, id_insumo: 5, cantidad: 2, fecha: '2026-12-01', hora_inicio: '08:30', frecuencia_horas: 6 })
    wrapper.unmount()
  })

  it('informa cuando no hay pacientes ni insumos en las opciones devueltas por el backend', async () => {
    const solicitar = vi.fn<typeof fetch>().mockImplementation(async url => {
      const ruta = String(url)
      const datos = ruta.endsWith('/permisos') ? { puedeCrearIndicacion: true }
        : ruta.endsWith('/opciones-indicacion')
        ? { pacientes: [], insumos: [] }
        : ruta.endsWith('/historial') ? [] : [dosis]
      return new Response(JSON.stringify(datos), { status: 200, headers: { 'Content-Type': 'application/json' } })
    })
    vi.stubGlobal('fetch', solicitar)
    const wrapper = mount(MedicacionView)
    await flushPromises()
    await wrapper.get('.new-order').trigger('click')
    expect(wrapper.text()).toContain('No hay pacientes internados disponibles')
    expect(wrapper.text()).toContain('No hay insumos registrados')
    wrapper.unmount()
  })

  it('agrupa las dosis por paciente e indicación y deja el botón solo en una dosis pendiente de Enfermería', async () => {
    const administrada = { ...dosis, id_indicacion_medica: 2, medicamento: 'Paracetamol', estado: 'Administrada' }
    const futura = { ...dosis, horario_programado: '2026-11-17T00:25:00-03:00', estado: 'Futura' }
    const solicitar = vi.fn<typeof fetch>().mockImplementation(async url => {
      const ruta = String(url)
      const datos = ruta.endsWith('/permisos') ? { puedeCrearIndicacion: false }
        : ruta.endsWith('/historial') ? []
        : ruta.endsWith('/opciones-indicacion') ? { mensaje: 'No autorizado' }
        : [dosis, futura, administrada]
      return new Response(JSON.stringify(datos), {
        status: ruta.endsWith('/opciones-indicacion') ? 403 : 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', solicitar)
    const wrapper = mount(MedicacionView)
    await flushPromises()

    expect(wrapper.findAll('.patient-group')).toHaveLength(1)
    expect(wrapper.findAll('.patient-group > .patient strong')).toHaveLength(1)
    expect(wrapper.findAll('.indication-group')).toHaveLength(2)
    expect(wrapper.findAll('.dose-row')).toHaveLength(3)
    expect(wrapper.findAll('.dose-actions .admin-button')).toHaveLength(1)
    expect(wrapper.text()).toContain('Programada')
    expect(wrapper.text()).toContain('Administrada')
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
