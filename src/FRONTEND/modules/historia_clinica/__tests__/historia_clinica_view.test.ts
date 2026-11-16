import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import HistoriaClinicaView from '../views/historia_clinica_view.vue';

describe('Historia Clínica conectada a la API', () => {
    const paciente = {
        id: 7,
        nombre: 'Paciente',
        apellido: 'Prueba',
        dni: '90000001',
        fecha_nacimiento: '1990-01-01',
        genero: 'Otro',
        telefono: '12345',
        email: 'prueba@example.test',
        obra_social: 1,
    };
    const historia = {
        paciente,
        alergias: [],
        antecedentesFamiliares: [],
        evolucionesMedicas: [],
        estudiosClinicos: [],
    };
    const json = (datos: unknown, status = 200) => new Response(JSON.stringify(datos), { status });
    let wrapper: VueWrapper;
    const fetchMock = vi.fn();
    function montar() {
        wrapper = mount(HistoriaClinicaView, { global: { stubs: { RouterLink: true } } });
    }
    beforeEach(() => {
        fetchMock.mockReset();
        fetchMock.mockImplementation(async (url: string, opciones?: RequestInit) => {
            if (url.endsWith('/sesion')) return json({ puedeRegistrar: true });
            if (url.endsWith('/pacientes')) return json([paciente]);
            if (opciones?.method === 'POST') return json({ id: 9 }, 201);
            return json(historia);
        });
        vi.stubGlobal('fetch', fetchMock);
    });
    afterEach(() => {
        wrapper?.unmount();
        vi.unstubAllGlobals();
    });

    it('muestra sólo pacientes y registros recibidos del servidor y envía las cookies', async () => {
        montar();
        await flushPromises();
        expect(wrapper.text()).toContain('90000001');
        expect(wrapper.text()).toContain('No hay alergias activas registradas.');
        expect(wrapper.text()).not.toContain('Carlos');
        expect(
            fetchMock.mock.calls.every(([, opciones]) => opciones.credentials === 'same-origin'),
        ).toBe(true);
    });
    it('ofrece consulta sin formularios si el servidor no habilita el registro', async () => {
        fetchMock.mockImplementation(async (url: string) =>
            url.endsWith('/sesion')
                ? json({ puedeRegistrar: false })
                : url.endsWith('/pacientes')
                  ? json([paciente])
                  : json(historia),
        );
        montar();
        await flushPromises();
        expect(wrapper.findAll('form')).toHaveLength(0);
        expect(wrapper.text()).toContain('90000001');
    });
    it('no muestra pacientes ficticios ante un rechazo de permisos', async () => {
        fetchMock.mockResolvedValue(json({ mensaje: 'Prohibido' }, 403));
        montar();
        await flushPromises();
        expect(wrapper.get('[role="alert"]').text()).toContain('permisos');
        expect(wrapper.findAll('.patient-option')).toHaveLength(0);
    });
    it('informa ausencia de pacientes', async () => {
        fetchMock.mockImplementation(async (url: string) =>
            url.endsWith('/sesion') ? json({ puedeRegistrar: true }) : json([]),
        );
        montar();
        await flushPromises();
        expect(wrapper.text()).toContain('No se encontraron pacientes.');
        expect(wrapper.findAll('form')).toHaveLength(0);
    });
    it('guarda la alergia con el ID seleccionado, sin DNI ni identidad profesional inventada', async () => {
        montar();
        await flushPromises();
        const form = wrapper.findAll('form')[0]!;
        const inputs = form.findAll('input');
        await inputs[0]!.setValue('Penicilina');
        await inputs[1]!.setValue('Erupción');
        await inputs[2]!.setValue('2026-11-16');
        await form.trigger('submit');
        await flushPromises();
        const post = fetchMock.mock.calls.find(([, opciones]) => opciones.method === 'POST')!;
        expect(post[0]).toBe('/api/historia-clinica/alergias');
        expect(JSON.parse(post[1].body)).toEqual({
            id_paciente: 7,
            sustancia: 'Penicilina',
            reaccion: 'Erupción',
            gravedad: 'leve',
            fecha_deteccion: '2026-11-16',
        });
        expect(wrapper.text()).toContain('Registro guardado correctamente.');
    });
    it('conserva el formulario y sus datos cuando el servidor rechaza un registro', async () => {
        montar();
        await flushPromises();
        fetchMock.mockImplementation(async (_url: string, opciones?: RequestInit) =>
            opciones?.method === 'POST' ? json({ mensaje: 'Dato inválido' }, 400) : json(historia),
        );
        const form = wrapper.findAll('form')[2]!;
        await form.get('input').setValue('Control');
        await form.get('textarea').setValue('Estable');
        await form.trigger('submit');
        await flushPromises();
        expect(wrapper.get('[role="alert"]').text()).toContain('Dato inválido');
        expect(wrapper.findAll('form')).toHaveLength(3);
        expect(form.get('input').element.value).toBe('Control');
    });
    it('descarta la respuesta clínica anterior cuando cambia el paciente', async () => {
        let resolver!: (respuesta: Response) => void;
        const demorada = new Promise<Response>((resolve) => {
            resolver = resolve;
        });
        fetchMock.mockImplementation(async (url: string) => {
            if (url.endsWith('/sesion')) return json({ puedeRegistrar: true });
            if (url.endsWith('/pacientes'))
                return json([paciente, { ...paciente, id: 8, nombre: 'Segundo' }]);
            if (url.endsWith('/paciente/7')) return demorada;
            return json(historia);
        });
        montar();
        await flushPromises();
        await wrapper.findAll('.patient-option')[1]!.trigger('click');
        await flushPromises();
        resolver(
            json({
                ...historia,
                alergias: [{ id: 1, sustancia: 'Respuesta obsoleta', estado: 'activa' }],
            }),
        );
        await flushPromises();
        expect(wrapper.text()).not.toContain('Respuesta obsoleta');
        expect(wrapper.get('.patient-profile').text()).toContain('Segundo');
    });
});
