// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import GestionCamasView from '../views/GestionCamasView.vue'
import AsignarCamaForm from '../components/AsignarCamaForm.vue'
import TransicionCamaForm from '../components/TransicionCamaForm.vue'
import { crearCamasApi, ErrorCamasApi } from '../services/camasApi'
import type { Cama, CamasApi } from '../types/camas'

vi.mock('../components/RecursosCamasNav.vue', () => ({ default: { template: '<nav />' } }))

const cama: Cama = {
  id: 101,
  estado: 'Libre',
  habitacion: 204,
  piso: 2,
  idTipoCama: 1,
  tipo: 'Compartida',
  disponible: true,
  idAsignacionActiva: null,
}
const asignacion = {
  id: 4,
  idCama: 101,
  idPaciente: 8,
  idUsuarioAsignador: 3,
  fechaIngreso: '2026-11-15T12:00:00Z',
}

function crearApi(): CamasApi {
  return {
    listar: vi.fn().mockResolvedValue([cama]),
    asignar: vi.fn().mockResolvedValue(asignacion),
    transicionar: vi.fn(),
  }
}

describe('formulario de asignación', () => {
  it.each(['', '0', '-2', '1.5', '2e2', '2147483648', 'abc'])(
    'no confirma identificador inválido %s',
    async (valor) => {
      const wrapper = mount(AsignarCamaForm, { props: { cama, enviando: false } })
      await wrapper.get('input').setValue(valor)
      await wrapper.get('form').trigger('submit')
      expect(wrapper.emitted('confirmar')).toBeUndefined()
      wrapper.unmount()
    },
  )
})

describe('vista integrada con servicio inyectado', () => {
  it('mantiene un único formulario al alternar asignación y mantenimiento', async () => {
    const api = crearApi()
    const wrapper = mount(GestionCamasView, { props: { api } })
    await flushPromises()
    await wrapper.get('article button').trigger('click')
    expect(wrapper.findComponent(AsignarCamaForm).exists()).toBe(true)
    const bloquear = wrapper
      .findAll('button')
      .find((boton) => boton.text() === 'Bloquear por mantenimiento')!
    await bloquear.trigger('click')
    expect(wrapper.findComponent(AsignarCamaForm).exists()).toBe(false)
    expect(wrapper.findComponent(TransicionCamaForm).exists()).toBe(true)
    await wrapper.get('article button').trigger('click')
    expect(wrapper.findComponent(AsignarCamaForm).exists()).toBe(true)
    expect(wrapper.findComponent(TransicionCamaForm).exists()).toBe(false)
    expect(api.asignar).not.toHaveBeenCalled()
    expect(api.transicionar).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('cancela cualquiera de los formularios sin enviar comandos', async () => {
    const api = crearApi()
    const wrapper = mount(GestionCamasView, { props: { api } })
    await flushPromises()
    await wrapper.get('article button').trigger('click')
    await wrapper.get('form button[type="button"]').trigger('click')
    expect(wrapper.find('form').exists()).toBe(false)
    const bloquear = wrapper
      .findAll('button')
      .find((boton) => boton.text() === 'Bloquear por mantenimiento')!
    await bloquear.trigger('click')
    await wrapper.get('form button[type="button"]').trigger('click')
    expect(wrapper.find('form').exists()).toBe(false)
    expect(api.asignar).not.toHaveBeenCalled()
    expect(api.transicionar).not.toHaveBeenCalled()
    wrapper.unmount()
  })
  it('carga el mapa, asigna y vuelve a consultar sin ocupar localmente', async () => {
    const api = crearApi()
    const wrapper = mount(GestionCamasView, { props: { api } })
    await flushPromises()
    await wrapper.get('article button').trigger('click')
    await wrapper.get('input').setValue('8')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(api.asignar).toHaveBeenCalledWith(101, 8)
    expect(api.listar).toHaveBeenCalledTimes(2)
    expect(wrapper.get('[role="status"]').text()).toContain('asignada')
    wrapper.unmount()
  })

  it('impide confirmar dos veces mientras la petición sigue pendiente', async () => {
    const api = crearApi()
    let resolver!: (valor: typeof asignacion) => void
    api.asignar = vi.fn(
      () =>
        new Promise<typeof asignacion>((resolve) => {
          resolver = resolve
        }),
    )
    const wrapper = mount(GestionCamasView, { props: { api } })
    await flushPromises()
    await wrapper.get('article button').trigger('click')
    await wrapper.get('input').setValue('8')
    await wrapper.get('form').trigger('submit')
    await wrapper.get('form').trigger('submit')
    expect(api.asignar).toHaveBeenCalledTimes(1)
    resolver(asignacion)
    await flushPromises()
    wrapper.unmount()
  })

  it('ante 409 actualiza el mapa y muestra el conflicto', async () => {
    const api = crearApi()
    api.asignar = vi.fn().mockRejectedValue(new ErrorCamasApi(409, 'La cama acaba de ser ocupada.'))
    vi.mocked(api.listar)
      .mockResolvedValueOnce([cama])
      .mockResolvedValueOnce([{ ...cama, estado: 'Ocupada', disponible: false }])
    const wrapper = mount(GestionCamasView, { props: { api } })
    await flushPromises()
    await wrapper.get('article button').trigger('click')
    await wrapper.get('input').setValue('8')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Revisá el estado actualizado')
    expect(wrapper.get('article button').attributes('disabled')).toBeDefined()
    expect(wrapper.find('form').exists()).toBe(false)
    wrapper.unmount()
  })

  it('un fallo de carga no muestra datos ficticios ni habilita asignaciones', async () => {
    const api = crearApi()
    api.listar = vi.fn().mockRejectedValue(new ErrorCamasApi(503, 'API no disponible'))
    const wrapper = mount(GestionCamasView, { props: { api } })
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('API no disponible')
    expect(wrapper.findAll('article')).toHaveLength(0)
    wrapper.unmount()
  })
})

describe('cliente HTTP', () => {
  it('envía sólo IDs de cama y paciente; la identidad la resuelve IAM', async () => {
    const solicitar = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ asignacion }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    expect(await crearCamasApi('/api/recursos-camas', solicitar).asignar(101, 8)).toEqual(
      asignacion,
    )
    expect(solicitar).toHaveBeenCalledWith(
      '/api/recursos-camas/asignaciones',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        body: JSON.stringify({ idCama: 101, idPaciente: 8 }),
      }),
    )
  })
  it('una respuesta HTML del servidor Vite no se interpreta como API exitosa', async () => {
    const solicitar = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('<html></html>', {
        headers: { 'Content-Type': 'text/html' },
      }),
    )
    await expect(crearCamasApi('/api/recursos-camas', solicitar).listar()).rejects.toThrow(
      'no está disponible',
    )
  })
})
