import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { rolActual } from '../../../../router/autenticacion'
import { permisosCamas } from '../services/permisosCamas'
import GestionCamasView from '../views/GestionCamasView.vue'
import type { Cama, CamasApi, EstadoCama } from '../services/recursosCamasApi'

describe('Controles visuales según el rol verificado por IAM', () => {
  let wrapper: VueWrapper
  const estados: EstadoCama[] = ['Libre', 'Ocupada', 'En limpieza', 'Bloqueada']
  const camas: Cama[] = estados.map((estado, i) => ({
    id: i + 1, estado, habitacion: 100 + i, piso: 1, idTipoCama: 1, tipo: 'Compartida',
    disponible: estado === 'Libre', idAsignacionActiva: estado === 'Ocupada' ? 10 : null,
  }))
  function api(): CamasApi {
    return { listar: vi.fn().mockResolvedValue(camas), crear: vi.fn(), listarTipos: vi.fn(),
      asignar: vi.fn(), buscarPacientePorDni: vi.fn(), transicionar: vi.fn().mockResolvedValue({
        idCama: 3, estadoAnterior: 'En limpieza', estado: 'Libre', idAsignacionFinalizada: null, fechaEgreso: null,
      }) }
  }
  async function mostrar(rol: string | null, servicio = api()) {
    rolActual.value = rol
    wrapper = mount(GestionCamasView, { props: { api: servicio }, global: { stubs: {
      RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
    } } })
    await flushPromises()
    return servicio
  }
  afterEach(() => { wrapper?.unmount(); rolActual.value = null })

  it.each([
    ['Administrador', [true, true, true, true, true, true]],
    ['Recepcionista', [false, true, true, false, false, false]],
    ['Médico', [false, false, false, false, false, false]],
    ['Enfermero', [false, false, false, false, false, true]],
    ['Limpieza', [false, false, false, true, false, false]],
  ] as const)('el adaptador visual refleja los permisos vigentes de %s', (rol, esperados) => {
    rolActual.value = rol
    const permisos = permisosCamas.value
    expect([permisos.crear, permisos.asignar, permisos.liberar, permisos.limpiar, permisos.mantener, permisos.inventario]).toEqual(esperados)
  })
  it('Limpieza ve el mapa, los filtros y únicamente la confirmación de limpieza', async () => {
    await mostrar('Limpieza')
    expect(wrapper.findAll('.cama')).toHaveLength(4)
    expect(wrapper.findAll('.cama button').map(b => b.text())).toEqual(['Confirmar limpieza'])
    expect(wrapper.findAll('.filtros select')).toHaveLength(2)
    expect(wrapper.findAll('.page-header button').map(b => b.text())).toEqual(['Actualizar mapa'])
    expect(wrapper.find('a[href="/recursos-camas/inventario"]').exists()).toBe(false)
    expect(wrapper.find('a[href="/recursos-camas"]').exists()).toBe(true)
  })
  it('Limpieza puede abrir y confirmar el formulario de higiene existente', async () => {
    const servicio = await mostrar('Limpieza')
    await wrapper.get('.cama button').trigger('click')
    await wrapper.get('.transicion form').trigger('submit'); await flushPromises()
    expect(servicio.transicionar).toHaveBeenCalledExactlyOnceWith(3, { accion: 'confirmar-limpieza', estadoEsperado: 'En limpieza' })
    expect(servicio.asignar).not.toHaveBeenCalled()
    expect(servicio.crear).not.toHaveBeenCalled()
  })
  it('Administrador conserva alta, inventario y todas las operaciones por estado', async () => {
    await mostrar('Administrador')
    for (const texto of ['+ Nueva cama', 'Asignar paciente', 'Liberar por alta o traslado',
      'Confirmar limpieza', 'Bloquear por mantenimiento', 'Finalizar mantenimiento']) expect(wrapper.text()).toContain(texto)
    expect(wrapper.find('a[href="/recursos-camas/inventario"]').exists()).toBe(true)
  })
  it('Recepcionista conserva asignación y liberación, sin alta ni higiene ni mantenimiento', async () => {
    await mostrar('Recepcionista')
    expect(wrapper.text()).toContain('Asignar paciente')
    expect(wrapper.text()).toContain('Liberar por alta o traslado')
    for (const texto of ['+ Nueva cama', 'Confirmar limpieza', 'Bloquear por mantenimiento', 'Finalizar mantenimiento']) expect(wrapper.text()).not.toContain(texto)
    expect(wrapper.find('a[href="/recursos-camas/inventario"]').exists()).toBe(false)
  })
  it.each(['Médico', 'Enfermero'])('%s mantiene consulta sin operaciones de camas', async rol => {
    await mostrar(rol)
    expect(wrapper.findAll('.cama')).toHaveLength(4)
    expect(wrapper.findAll('.cama button')).toHaveLength(0)
    expect(wrapper.text()).not.toContain('+ Nueva cama')
    expect(wrapper.find('a[href="/recursos-camas/inventario"]').exists()).toBe(rol === 'Enfermero')
  })
  it.each([null, 'Desconocido'])('sin un rol reconocido no muestra acciones ni inventario: %s', async rol => {
    await mostrar(rol)
    expect(wrapper.findAll('.cama button')).toHaveLength(0)
    expect(wrapper.text()).not.toContain('+ Nueva cama')
    expect(wrapper.find('a[href="/recursos-camas/inventario"]').exists()).toBe(false)
  })
  it('si cambia el rol oculta las acciones y formularios que dejaron de estar autorizados', async () => {
    const servicio = api()
    vi.mocked(servicio.listarTipos).mockResolvedValue([{ id: 1, nombre: 'Compartida' }])
    await mostrar('Administrador', servicio)
    await wrapper.findAll('.page-header button').find(b => b.text() === '+ Nueva cama')!.trigger('click'); await flushPromises()
    expect(wrapper.find('.alta-cama').exists()).toBe(true)
    rolActual.value = 'Limpieza'; await flushPromises()
    expect(wrapper.find('.alta-cama').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Asignar paciente')
    expect(wrapper.find('a[href="/recursos-camas/inventario"]').exists()).toBe(false)
  })
})
