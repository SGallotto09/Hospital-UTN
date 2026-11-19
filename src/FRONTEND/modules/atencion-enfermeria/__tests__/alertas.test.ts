// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import AlertasView from '../views/AlertasView.vue';

afterEach(() => vi.unstubAllGlobals());

describe('alertas del monitoreo', () => {
    it('muestra alertas derivadas de los últimos signos vitales del dashboard', async () => {
        const solicitar = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify([
            {
                id: 3, nombre: 'Ana', apellido: 'Prueba', habitacion: 12,
                temperatura: 39.4, fecha_hora: '2026-11-19T12:00:00.000Z'
            },
            {
                id: 4, nombre: 'Luis', apellido: 'Prueba', habitacion: 13,
                temperatura: 37, fecha_hora: '2026-11-19T12:01:00.000Z'
            }
        ]), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        vi.stubGlobal('fetch', solicitar);

        const wrapper = mount(AlertasView, { global: { stubs: ['RouterLink'] } });
        await flushPromises();

        expect(solicitar).toHaveBeenCalledWith('/api/dashboard', { credentials: 'include' });
        expect(wrapper.text()).toContain('Ana Prueba');
        expect(wrapper.text()).toContain('39.4 °C');
        expect(wrapper.text()).not.toContain('Luis Prueba');
        expect(wrapper.text()).toContain('1');
        wrapper.unmount();
    });

    it('informa el error si no puede consultar el dashboard', async () => {
        vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 500 })));

        const wrapper = mount(AlertasView, { global: { stubs: ['RouterLink'] } });
        await flushPromises();

        expect(wrapper.get('[role="alert"]').text()).toContain('No se pudieron cargar');
        wrapper.unmount();
    });
});
