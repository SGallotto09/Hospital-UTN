// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import RecursosCamasNav from '../components/RecursosCamasNav.vue'
import { recursosCamasRoutes } from '../router/routes'

async function montarNavegacion(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: recursosCamasRoutes.map((ruta) => ({
      name: ruta.name,
      path: `/${ruta.path}`,
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
