import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import Panel from '../views/AtenciónEnfermeriaView.vue';
import PacientesInternados from '../views/PacientesInternadosView.vue';
import Protocolos from '../views/ProtocolosView.vue';

describe('Carga de pacientes de las pantallas de Enfermería', () => {
    let wrapper: VueWrapper;
    afterEach(() => { wrapper?.unmount(); vi.unstubAllGlobals(); });
    const casos = [
        { nombre: 'Panel', vista: Panel, ruta: '/api/dashboard' },
        { nombre: 'Internados', vista: PacientesInternados, ruta: '/api/pacientes-internados?buscar=' },
        { nombre: 'Protocolos', vista: Protocolos, ruta: '/api/pacientes-internados' },
    ];
    for (const { nombre, vista, ruta } of casos) {
        it(`${nombre} consulta su endpoint con cookies y admite un listado vacío`, async () => {
            const solicitar = vi.fn<typeof fetch>().mockResolvedValue(new Response('[]', { headers: { 'Content-Type': 'application/json' } }));
            vi.stubGlobal('fetch', solicitar);
            wrapper = mount(vista, { global: { stubs: { RouterLink: true } } });
            await flushPromises();
            expect(solicitar).toHaveBeenCalledWith(ruta, expect.objectContaining({ credentials: 'include' }));
            expect(wrapper.text()).not.toContain('No se pudieron cargar');
            expect(wrapper.text()).not.toContain('Error al obtener los pacientes');
            if (nombre === 'Panel') expect(wrapper.text()).toContain('No hay pacientes internados');
            if (nombre === 'Internados') expect(wrapper.text()).toContain('No se encontraron pacientes internados');
            if (nombre === 'Protocolos') expect(wrapper.findAll('#paciente option')).toHaveLength(1);
        });
    }
});
