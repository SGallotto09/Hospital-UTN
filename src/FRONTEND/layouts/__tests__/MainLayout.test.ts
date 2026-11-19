import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import MainLayout from '../MainLayout.vue';
import { accesoVerificado } from '../../../router/autenticacion';
const mocks = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('vue-router', () => ({ useRouter: () => ({ replace: mocks.replace }) }));

describe('Logout desde el menú lateral', () => {
    let wrapper: VueWrapper;
    const fetchMock = vi.fn();
    beforeEach(() => {
        mocks.replace.mockReset(); fetchMock.mockReset();
        vi.stubGlobal('fetch', fetchMock); accesoVerificado.value = true;
        wrapper = mount(MainLayout, { global: { stubs: { RouterLink: true, RouterView: true } } });
    });
    afterEach(() => { wrapper.unmount(); vi.unstubAllGlobals(); accesoVerificado.value = false; });
    it('espera la confirmación del servidor, evita duplicados y luego limpia el acceso', async () => {
        let resolver!: (respuesta: Response) => void;
        fetchMock.mockReturnValue(new Promise<Response>(resolve => { resolver = resolve; }));
        await wrapper.get('.logout-button').trigger('click');
        await wrapper.get('.logout-button').trigger('click');
        expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/api/auth/logout', { method: 'POST', credentials: 'include' });
        expect(mocks.replace).not.toHaveBeenCalled();
        expect(accesoVerificado.value).toBe(true);
        resolver(new Response('{}', { status: 200 })); await flushPromises();
        expect(mocks.replace).toHaveBeenCalledWith('/login');
        expect(accesoVerificado.value).toBe(false);
    });
    it.each([401, 500, 502])('HTTP %s no simula que la sesión terminó', async status => {
        fetchMock.mockResolvedValue(new Response('{}', { status }));
        await wrapper.get('.logout-button').trigger('click'); await flushPromises();
        expect(mocks.replace).not.toHaveBeenCalled();
        expect(accesoVerificado.value).toBe(true);
        expect(wrapper.get('[role="alert"]').text()).toContain('No se pudo cerrar');
        expect(wrapper.get('.logout-button').attributes('disabled')).toBeUndefined();
    });
    it('un fallo de conexión muestra un error y permite reintentar', async () => {
        fetchMock.mockRejectedValue(new TypeError('Sin conexión'));
        await wrapper.get('.logout-button').trigger('click'); await flushPromises();
        expect(mocks.replace).not.toHaveBeenCalled();
        expect(wrapper.get('[role="alert"]').text()).toContain('No se pudo conectar');
    });
});
