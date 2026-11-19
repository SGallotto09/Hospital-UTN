import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import { flushPromises } from '@vue/test-utils';
import rutasReales from '../index';
import { accesoVerificado, invalidarAcceso, protegerRutas } from '../autenticacion';

describe('Router real: sesión IAM y autorización', () => {
    let router: Router;
    let quitarProteccion: () => void;
    const fetchMock = vi.fn();
    const sesion = (rol = 'Administrador') => new Response(JSON.stringify({
        usuario: { id: 1, rol }, expira: new Date(Date.now() + 60000).toISOString(),
    }), { status: 200 });

    beforeEach(() => {
        fetchMock.mockReset().mockImplementation(async () => sesion());
        vi.stubGlobal('fetch', fetchMock);
        router = createRouter({ history: createMemoryHistory(), routes: rutasReales.options.routes });
        quitarProteccion = protegerRutas(router);
    });
    afterEach(() => {
        quitarProteccion(); router.options.history.destroy();
        vi.unstubAllGlobals(); vi.useRealTimers();
    });

    it('registra Historia Clínica dentro del layout y conserva la URL anterior como alias', () => {
        const ruta = router.resolve('/historia-clinica');
        expect(ruta.matched).toHaveLength(2);
        expect(ruta.name).toBe('historia_clinica');
        expect(ruta.matched[0]?.components?.default).toBeDefined();
        expect(router.resolve('/historia_clinica').name).toBe(ruta.name);
    });

    const privadas = rutasReales.getRoutes()
        .filter(ruta => ruta.name && ruta.path !== '/login' && !ruta.aliasOf)
        .map(ruta => ruta.path);
    it.each(privadas)('sin sesión: %s redirige a login sin ciclos', async ruta => {
        fetchMock.mockImplementation(async () => new Response('{}', { status: 401 }));
        await router.push(ruta);
        expect(router.currentRoute.value.path).toBe('/login');
        expect(accesoVerificado.value).toBe(false);
        expect(fetchMock).toHaveBeenCalledOnce();
    });

    it('login es público y no consulta la sesión', async () => {
        await router.push('/login'); await router.push('/login?motivo=sesion');
        expect(fetchMock).not.toHaveBeenCalled();
    });
    it('Limpieza accede al mapa de camas con la sesión IAM', async () => {
        fetchMock.mockImplementation(async () => sesion('Limpieza'));
        await router.push('/recursos-camas');
        expect(router.currentRoute.value.path).toBe('/recursos-camas');
        expect(accesoVerificado.value).toBe(true);
    });
    it.each(['/usuarios/registro', '/historia-clinica', '/facturacion', '/recursos-camas/inventario',
        '/enfermeria', '/enfermeria/pacientes', '/enfermeria/signos-vitales', '/enfermeria/medicacion',
        '/enfermeria/protocolos', '/admisiones/dashboard', '/admisiones/agenda', '/admisiones/triaje',
    ])('Limpieza no accede directamente a %s', async ruta => {
        fetchMock.mockImplementation(async () => sesion('Limpieza'));
        await router.push(ruta);
        expect(router.currentRoute.value.path).toBe('/login');
        expect(router.currentRoute.value.query.motivo).toBe('permiso');
    });
    it('un usuario autenticado accede a Historia Clínica usando cookies, sin caché', async () => {
        await router.push('/historia-clinica');
        expect(router.currentRoute.value.path).toBe('/historia-clinica');
        expect(accesoVerificado.value).toBe(true);
        expect(fetchMock).toHaveBeenCalledWith('/api/auth/sesion', expect.objectContaining({
            credentials: 'include', cache: 'no-store',
        }));
        await router.push('/recursos-camas');
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    it('la sesión expirada no reutiliza una autorización anterior', async () => {
        await router.push('/historia-clinica');
        fetchMock.mockImplementation(async () => new Response('{}', { status: 401 }));
        await router.push('/admisiones/dashboard');
        expect(router.currentRoute.value.path).toBe('/login');
        expect(accesoVerificado.value).toBe(false);
    });
    it.each([
        ['/usuarios/registro', 'Enfermero'], ['/facturacion', 'Médico'],
        ['/historia-clinica', 'Recepcionista'], ['/recursos-camas/inventario', 'Limpieza'],
        ['/enfermeria/protocolos', 'Recepcionista'],
    ])('rechaza %s al rol %s', async (ruta, rol) => {
        fetchMock.mockImplementation(async () => sesion(rol));
        await router.push(ruta);
        expect(router.currentRoute.value.path).toBe('/login');
        expect(router.currentRoute.value.query.motivo).toBe('permiso');
        expect(accesoVerificado.value).toBe(false);
    });
    it('un fallo temporal no conserva acceso previo y muestra un motivo controlado', async () => {
        await router.push('/historia-clinica');
        fetchMock.mockRejectedValue(new TypeError('Fallo de red'));
        await router.push('/recursos-camas');
        expect(router.currentRoute.value.path).toBe('/login');
        expect(router.currentRoute.value.query.motivo).toBe('conexion');
        expect(accesoVerificado.value).toBe(false);
    });
    it('rechaza una respuesta de sesión incompleta', async () => {
        fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
        await router.push('/historia-clinica');
        expect(router.currentRoute.value.query.motivo).toBe('conexion');
        expect(accesoVerificado.value).toBe(false);
    });
    it('después del logout ni Atrás ni la URL directa recuperan la pantalla privada', async () => {
        await router.push('/historia-clinica'); await router.push('/recursos-camas');
        invalidarAcceso();
        fetchMock.mockImplementation(async () => new Response('{}', { status: 401 }));
        await router.replace('/login');
        const consultas = fetchMock.mock.calls.length;
        router.back();
        await vi.waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(consultas));
        await flushPromises();
        expect(router.currentRoute.value.path).toBe('/login');
        await router.push('/historia-clinica');
        expect(router.currentRoute.value.path).toBe('/login');
        expect(accesoVerificado.value).toBe(false);
    });
    it('revalida y oculta el contenido al recuperar foco', async () => {
        await router.push('/historia-clinica');
        fetchMock.mockImplementation(async () => new Response('{}', { status: 401 }));
        window.dispatchEvent(new Event('focus'));
        expect(accesoVerificado.value).toBe(false);
        await flushPromises();
        expect(router.currentRoute.value.path).toBe('/login');
    });
    it('revalida una página restaurada desde el historial del navegador', async () => {
        await router.push('/historia-clinica');
        fetchMock.mockImplementation(async () => new Response('{}', { status: 401 }));
        const evento = new Event('pageshow');
        Object.defineProperty(evento, 'persisted', { value: true });
        window.dispatchEvent(evento); await flushPromises();
        expect(router.currentRoute.value.path).toBe('/login');
        expect(accesoVerificado.value).toBe(false);
    });
    it('detecta el vencimiento mientras la pantalla permanece abierta', async () => {
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
        fetchMock.mockImplementationOnce(async () => new Response(JSON.stringify({
            usuario: { id: 1, rol: 'Administrador' }, expira: new Date(Date.now() + 50).toISOString(),
        }))).mockImplementation(async () => new Response('{}', { status: 401 }));
        await router.push('/historia-clinica');
        await vi.advanceTimersByTimeAsync(60);
        expect(router.currentRoute.value.path).toBe('/login');
        expect(accesoVerificado.value).toBe(false);
    });
    it('comparte consultas concurrentes pero no guarda la autorización como caché', async () => {
        let resolver!: (respuesta: Response) => void;
        fetchMock.mockReturnValueOnce(new Promise<Response>(resolve => { resolver = resolve; }));
        const primera = router.push('/historia-clinica');
        await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
        const segunda = router.push('/recursos-camas');
        await flushPromises(); expect(fetchMock).toHaveBeenCalledOnce();
        resolver(sesion()); await Promise.all([primera, segunda]);
        expect(router.currentRoute.value.path).toBe('/recursos-camas');
        await router.push('/admisiones/dashboard');
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });
});
