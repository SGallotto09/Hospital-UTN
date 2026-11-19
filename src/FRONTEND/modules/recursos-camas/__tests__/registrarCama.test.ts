import { rolActual } from '../../../../router/autenticacion'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import GestionCamasView from '../views/GestionCamasView.vue'
import { crearCamasApi, ErrorCamasApi, type CamasApi, type Cama } from '../services/recursosCamasApi'

beforeEach(() => { rolActual.value = 'Administrador' })
afterEach(() => { rolActual.value = null })

vi.mock('../components/RecursosCamasNav.vue', () => ({ default: { template: '<nav />' } }))
describe('Nueva cama desde el mapa', () => {
  let wrapper: VueWrapper
  const cama: Cama = { id: 10, habitacion: 204, piso: 0, idTipoCama: 1, tipo: 'Compartida', estado: 'Libre', disponible: true, idAsignacionActiva: null }
  function crearApi(): CamasApi {
    return { listar: vi.fn().mockResolvedValue([]), crear: vi.fn().mockResolvedValue({ id: 10 }),
      listarTipos: vi.fn().mockResolvedValue([{ id: 1, nombre: 'Compartida' }, { id: 2, nombre: 'Privada' }]),
      asignar: vi.fn(), transicionar: vi.fn(), buscarPacientePorDni: vi.fn() }
  }
  const boton = (texto: string) => wrapper.findAll('button').find(b => b.text() === texto)!
  async function abrir(api: CamasApi) {
    wrapper = mount(GestionCamasView, { props: { api } })
    await flushPromises(); await boton('+ Nueva cama').trigger('click'); await flushPromises()
  }
  async function completar() {
    await wrapper.get('[name="habitacion"]').setValue('204')
    await wrapper.get('[name="piso"]').setValue('0')
    await wrapper.get('[name="idTipoCama"]').setValue('1')
  }
  afterEach(() => wrapper?.unmount())
  it('guarda sólo los tres campos y actualiza el mapa sin recargar la página', async () => {
    const api = crearApi()
    vi.mocked(api.listar).mockResolvedValueOnce([]).mockResolvedValue([cama])
    await abrir(api); await completar()
    await wrapper.get('.filtros select').setValue('Ocupada')
    await wrapper.get('form[aria-label="Nueva cama"]').trigger('submit'); await flushPromises()
    expect(api.crear).toHaveBeenCalledExactlyOnceWith({ habitacion: 204, piso: 0, idTipoCama: 1 })
    expect(api.listar).toHaveBeenCalledTimes(2)
    expect(wrapper.findAll('.mapa > *')).toHaveLength(1)
    expect(wrapper.text()).toContain('registrada correctamente en estado Libre')
    expect(wrapper.find('form[aria-label="Nueva cama"]').exists()).toBe(false)
  })
  it('muestra los tipos reales y permite cancelar sin escritura', async () => {
    const api = crearApi(); await abrir(api)
    expect(wrapper.get('[name="idTipoCama"]').text()).toContain('Privada')
    await boton('Cancelar').trigger('click')
    expect(wrapper.find('form[aria-label="Nueva cama"]').exists()).toBe(false)
    expect(api.crear).not.toHaveBeenCalled()
  })
  it('no envía campos incompletos', async () => {
    const api = crearApi(); await abrir(api)
    await wrapper.get('form').trigger('submit')
    expect(api.crear).not.toHaveBeenCalled()
    expect(wrapper.get('[role="alert"]').text()).toContain('valores válidos')
  })
  it('un rechazo de permisos no abre un formulario ficticio', async () => {
    const api = crearApi(); vi.mocked(api.listarTipos).mockRejectedValue(new ErrorCamasApi(403, 'Sin permiso'))
    await abrir(api)
    expect(wrapper.get('[role="alert"]').text()).toBe('Sin permiso')
    expect(wrapper.find('form').exists()).toBe(false)
  })
  it('un conflicto conserva el formulario e informa el error sin repetir el POST', async () => {
    const api = crearApi(); vi.mocked(api.crear).mockRejectedValue(new ErrorCamasApi(409, 'Cama duplicada'))
    await abrir(api); await completar(); await wrapper.get('form').trigger('submit'); await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Cama duplicada')
    expect(wrapper.find('form').exists()).toBe(true)
    expect(api.crear).toHaveBeenCalledOnce()
  })
  it('evita solicitudes duplicadas mientras guarda', async () => {
    const api = crearApi(); let terminar!: (valor: { id: number }) => void
    vi.mocked(api.crear).mockReturnValue(new Promise(resolve => { terminar = resolve }))
    await abrir(api); await completar(); await wrapper.get('form').trigger('submit'); await wrapper.get('form').trigger('submit')
    expect(api.crear).toHaveBeenCalledOnce()
    terminar({ id: 10 }); await flushPromises()
  })
  it('el transporte usa los endpoints nuevos y las cookies existentes', async () => {
    const solicitar = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(JSON.stringify({ tipos: [{ id: 1, nombre: 'Compartida' }] }), { headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ cama: { id: 10, estado: 'Libre' } }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
    const api = crearCamasApi('/api/recursos-camas', solicitar)
    expect(await api.listarTipos()).toEqual([{ id: 1, nombre: 'Compartida' }])
    expect(await api.crear({ habitacion: 204, piso: 0, idTipoCama: 1 })).toEqual({ id: 10, estado: 'Libre' })
    expect(solicitar.mock.calls[1]).toEqual(['/api/recursos-camas/camas', expect.objectContaining({ credentials: 'same-origin', method: 'POST', body: JSON.stringify({ habitacion: 204, piso: 0, idTipoCama: 1 }) })])
  })
})
