// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import SignosVitalesView from '../views/SignosVitalesView.vue';

afterEach(() => vi.unstubAllGlobals());

describe('registro de signos vitales desde la vista', () => {
    it('envía sólo los valores clínicos y conserva las cookies de sesión', async () => {
        const solicitar = vi.fn<typeof fetch>().mockImplementation(async (url, opciones) => {
            if (opciones?.method === 'POST') {
                return new Response(JSON.stringify({ signoVital: { id: 5 }, alerta: false }), {
                    status: 201, headers: { 'Content-Type': 'application/json' }
                });
            }
            return new Response(JSON.stringify(String(url).includes('/pacientes-internados')
                ? [{ id: 3, nombre: 'Ana', apellido: 'Prueba', habitacion: 2, piso: 1 }]
                : []), { status: 200, headers: { 'Content-Type': 'application/json' } });
        });
        vi.stubGlobal('fetch', solicitar);

        const wrapper = mount(SignosVitalesView);
        await flushPromises();
        await wrapper.get('input[placeholder="120/80"]').setValue('120/80');
        await wrapper.get('input[placeholder="72"]').setValue('72');
        await wrapper.get('input[placeholder="36.5"]').setValue('36.5');
        await wrapper.get('.primary-button').trigger('click');
        await flushPromises();

        const [url, opciones] = solicitar.mock.calls.find(([, request]) => request?.method === 'POST') ?? [];
        expect(url).toBe('/api/signos-vitales');
        expect(opciones?.credentials).toBe('include');
        expect(JSON.parse(String(opciones?.body))).toEqual({
            id_paciente: 3,
            presion_arterial: '120/80',
            frecuencia_cardiaca: 72,
            temperatura: 36.5
        });
        expect(JSON.parse(String(opciones?.body))).not.toHaveProperty('id_enfermero');
        wrapper.unmount();
    });
});
