// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import { rolActual } from '../../../../router/autenticacion'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import RecursosCamasNav from '../components/RecursosCamasNav.vue'
import routerAplicacion from '../../../../router/index'

beforeEach(() => { rolActual.value = 'Administrador' })
afterEach(() => { rolActual.value = null })

async function montarNavegacion(path: string) {
  const rutas = routerAplicacion
    .getRoutes()
    .filter((ruta) => ruta.path === '/recursos-camas' || ruta.path === '/recursos-camas/inventario')
  expect(rutas).toHaveLength(2)
  expect(routerAplicacion.resolve('/recursos-camas').name).toBe('recursos-camas')
  expect(routerAplicacion.resolve('/recursos-camas/inventario').name).toBe(
    'recursos-camas-inventario',
  )
  const router = createRouter({
    history: createMemoryHistory(),
    routes: rutas.map((ruta) => ({
      name: ruta.name,
      path: ruta.path,
      component: { template: '<div />' },
    })),
  })
  await router.push(path)
  await router.isReady()
  return { router, wrapper: mount(RecursosCamasNav, { global: { plugins: [router] } }) }
}

describe('navegación de Recursos y Camas', () => {
  it.each([
    ['/recursos-camas', 'Mapa de camas'],
    ['/recursos-camas/inventario', 'Inventario de insumos'],
  ])('marca sólo la pestaña de %s', async (path, texto) => {
    const { wrapper } = await montarNavegacion(path)
    expect(wrapper.findAll('a')).toHaveLength(2)
    expect(wrapper.findAll('[aria-current="page"]')).toHaveLength(1)
    expect(wrapper.get('[aria-current="page"]').text()).toBe(texto)
    expect(wrapper.get('a[href="/recursos-camas"]').text()).toBe('Mapa de camas')
    expect(wrapper.get('a[href="/recursos-camas/inventario"]').text()).toBe('Inventario de insumos')
    wrapper.unmount()
  })

  it('navega entre las rutas existentes sin registrarlas de nuevo', async () => {
    const { router, wrapper } = await montarNavegacion('/recursos-camas')
    await wrapper.get('a[href="/recursos-camas/inventario"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('recursos-camas-inventario')
    expect(wrapper.get('[aria-current="page"]').text()).toBe('Inventario de insumos')
    wrapper.unmount()
  })
})
