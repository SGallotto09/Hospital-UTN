import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import RegistroUsuariosView from '../RegistroUsuariosView.vue';

describe('Registro de usuarios con Limpieza', () => {
    let wrapper: VueWrapper;
    afterEach(() => { wrapper?.unmount(); vi.unstubAllGlobals(); });
    it('conserva los cinco roles y envía el nombre Limpieza al endpoint existente', async () => {
        const solicitar = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ mensaje: 'Usuario registrado correctamente' }), { status: 201 }));
        vi.stubGlobal('fetch', solicitar);
        wrapper = mount(RegistroUsuariosView);
        expect(wrapper.findAll('option').map(opcion => opcion.attributes('value')))
            .toEqual(['Administrador', 'Médico', 'Enfermero', 'Recepcionista', 'Limpieza']);
        const valores = ['Usuario', 'Prueba', '90000003', 'test@example.test', 'limpieza_test', 'clave-exclusiva-de-pruebas'];
        for (const [indice, campo] of wrapper.findAll('input').entries()) await campo.setValue(valores[indice]);
        await wrapper.get('select').setValue('Limpieza');
        await wrapper.get('form').trigger('submit'); await flushPromises();
        expect(solicitar).toHaveBeenCalledExactlyOnceWith('/api/auth/registro', expect.objectContaining({
            method: 'POST', credentials: 'same-origin', body: JSON.stringify({ nombre: valores[0], apellido: valores[1],
                dni: valores[2], email: valores[3], usuario: valores[4], contrasenia: valores[5], rol: 'Limpieza' }),
        }));
        expect(wrapper.text()).toContain('Usuario registrado correctamente');
    });
});
