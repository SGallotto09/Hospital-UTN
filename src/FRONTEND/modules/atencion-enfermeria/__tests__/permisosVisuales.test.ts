import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { rolActual } from '../../../../router/autenticacion';
import router from '../../../../router';
import Nav from '../components/EnfermeriaNav.vue';
import Panel from '../views/AtenciónEnfermeriaView.vue';
import Protocolos from '../views/ProtocolosView.vue';

let wrapper: VueWrapper | undefined;
afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    rolActual.value = null;
    vi.unstubAllGlobals();
});

describe('Controles de Enfermería según IAM', () => {
    it.each(['Médico', 'Enfermero'])('%s puede navegar a Medicación', rol => {
        rolActual.value = rol;
        wrapper = mount(Nav, { global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } });
        expect(wrapper.text()).toContain('Medicación');
        expect(router.resolve('/enfermeria/medicacion').meta.roles).toContain(rol);
    });

    it('Administrador conserva consultas y no ve enlaces clínicos prohibidos', () => {
        rolActual.value = 'Administrador';
        wrapper = mount(Nav, { global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } });
        expect(wrapper.text()).toContain('Panel');
        expect(wrapper.text()).toContain('Protocolos');
        expect(wrapper.text()).not.toContain('Medicación');
        expect(wrapper.text()).not.toContain('Signos vitales');
        expect(router.resolve('/enfermeria/medicacion').meta.roles).not.toContain('Administrador');
        expect(router.resolve('/enfermeria/signos-vitales').meta.roles).not.toContain('Administrador');
    });

    it.each(['Administrador', 'Enfermero'])('%s sólo ve las acciones de escritura autorizadas', async rol => {
        rolActual.value = rol;
        vi.stubGlobal('fetch', vi.fn(async () => new Response('[]')));
        wrapper = mount(Panel, { global: { stubs: { RouterLink: true } } });
        await flushPromises();
        expect(wrapper.text().includes('+ Registrar control')).toBe(rol === 'Enfermero');
        wrapper.unmount();
        wrapper = mount(Protocolos, { global: { stubs: { RouterLink: true } } });
        await flushPromises();
        expect(wrapper.find('.generate-button').exists()).toBe(rol === 'Enfermero');
        expect(wrapper.find('#paciente').exists()).toBe(true);
    });
});
