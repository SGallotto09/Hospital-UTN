// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import InventarioView from '../views/InventarioView.vue'
import { crearInventarioApi } from '../services/inventarioApi'
import type { ResultadoConsumo } from '../types/inventario'

vi.mock('../components/RecursosCamasNav.vue', () => ({ default: { template: '<nav />' } }))

const insumos = [
  { id: 4, nombre: 'Ibuprofeno 400mg', stock: 50, piso: 2 },
  { id: 5, nombre: 'Gasas', stock: 0, piso: null },
  { id: 6, nombre: 'Guantes', stock: 12, piso: 0 },
]
const resultado: ResultadoConsumo = {
  estado: 'descontado',
  idEvento: 'evento-20',
  idAdministracion: 20,
  idInsumo: 4,
  cantidadDescontada: 1,
  stockRestante: 49,
}
const responder = (datos: unknown, status = 200) =>
  new Response(JSON.stringify(datos), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

describe('HU 3.1: inventario Vue y cliente HTTP', () => {
  it('consulta y muestra stock, piso cero y existencias agotadas', async () => {
    const solicitar = vi.fn<typeof fetch>().mockResolvedValue(responder({ insumos }))
    const wrapper = mount(InventarioView, {
      props: { api: crearInventarioApi('/api/recursos-camas', solicitar) },
    })
    await flushPromises()
    expect(wrapper.findAll('tbody tr')).toHaveLength(3)
    expect(wrapper.text()).toContain('Sin stock')
    expect(wrapper.text()).toContain('Sin asignar')
    expect(solicitar).toHaveBeenCalledWith('/api/recursos-camas/insumos', {
      credentials: 'same-origin',
    })
    await wrapper.get('select').setValue('0')
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
    expect(wrapper.get('tbody tr').text()).toContain('Guantes')
    await wrapper.get('select').setValue('sin-piso')
    expect(wrapper.get('tbody tr').text()).toContain('Gasas')
    wrapper.unmount()
  })
  it('actualiza desde la API sin descontar localmente al mostrar un resultado', async () => {
    const listar = vi
      .fn()
      .mockResolvedValueOnce(insumos)
      .mockResolvedValue([{ ...insumos[0], stock: 49 }])
    const wrapper = mount(InventarioView, { props: { api: { listar } } })
    await flushPromises()
    expect(wrapper.find('.resultado').exists()).toBe(false)
    await wrapper.setProps({ resultadoConsumo: resultado })
    await flushPromises()
    expect(wrapper.get('.resultado').text()).toContain('se descontaron 1')
    expect(wrapper.get('tbody tr').text()).toContain('49')
    expect(listar).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })
  it('muestra el duplicado sin afirmar un segundo descuento', async () => {
    const wrapper = mount(InventarioView, {
      props: {
        api: { listar: vi.fn().mockResolvedValue(insumos) },
        resultadoConsumo: {
          ...resultado,
          estado: 'duplicado',
          cantidadDescontada: 0,
          stockRestante: null,
        },
      },
    })
    await flushPromises()
    expect(wrapper.get('.resultado').text()).toContain('No se descontaron unidades adicionales')
    expect(wrapper.get('tbody tr').text()).toContain('50')
    wrapper.unmount()
  })
  it('muestra un error de consumo recibido sin simular cambios de stock', async () => {
    const wrapper = mount(InventarioView, {
      props: {
        api: { listar: vi.fn().mockResolvedValue(insumos) },
        errorConsumo: 'Stock insuficiente',
      },
    })
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toBe('Stock insuficiente')
    expect(wrapper.get('tbody tr').text()).toContain('50')
    wrapper.unmount()
  })
  it('no muestra existencias ficticias ante un fallo de API', async () => {
    const wrapper = mount(InventarioView, {
      props: { api: { listar: vi.fn().mockRejectedValue(new Error('API no disponible')) } },
    })
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('API no disponible')
    expect(wrapper.findAll('tbody tr')).toHaveLength(0)
    wrapper.unmount()
  })
  it('permite actualizar manualmente las existencias', async () => {
    const listar = vi.fn().mockResolvedValue(insumos)
    const wrapper = mount(InventarioView, { props: { api: { listar } } })
    await flushPromises()
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(listar).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })
  it('muestra un inventario vacío sin convertirlo en un error', async () => {
    const wrapper = mount(InventarioView, {
      props: { api: { listar: vi.fn().mockResolvedValue([]) } },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('No hay insumos')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    wrapper.unmount()
  })
  it('propaga errores HTTP de permisos', async () => {
    const solicitar = vi
      .fn<typeof fetch>()
      .mockResolvedValue(responder({ mensaje: 'No tenés permiso' }, 403))
    await expect(crearInventarioApi('/api/recursos-camas', solicitar).listar()).rejects.toThrow(
      'No tenés permiso',
    )
  })
  it('rechaza HTML y respuestas sin lista de insumos', async () => {
    const solicitar = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response('<html></html>', {
          headers: { 'Content-Type': 'text/html' },
        }),
      )
      .mockResolvedValueOnce(responder({}))
    const api = crearInventarioApi('/api/recursos-camas', solicitar)
    await expect(api.listar()).rejects.toThrow('no está disponible')
    await expect(api.listar()).rejects.toThrow('no es válida')
  })
})
