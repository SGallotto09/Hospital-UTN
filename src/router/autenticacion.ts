import { ref } from 'vue';
import type { Router, RouteLocationNormalized } from 'vue-router';

// Sólo controla la presentación durante la verificación. Nunca acredita una sesión.
export const accesoVerificado = ref(false);
let revision = 0;

export function invalidarAcceso(): void {
    revision++;
    accesoVerificado.value = false;
}

interface Sesion {
    usuario: { id: number; rol: string };
    expira: string | null;
}

export function protegerRutas(router: Router): () => void {
    let enCurso: Promise<Sesion | null> | undefined;
    let temporizador: ReturnType<typeof setTimeout> | undefined;

    async function consultarSesion(): Promise<Sesion | null> {
        const respuesta = await fetch('/api/auth/sesion', {
            credentials: 'include', cache: 'no-store', signal: AbortSignal.timeout(8000),
        });
        if (respuesta.status === 401) return null;
        if (!respuesta.ok) throw new Error('No se pudo verificar la sesión.');
        const sesion: Sesion = await respuesta.json();
        if (!Number.isSafeInteger(sesion.usuario?.id) || sesion.usuario.id <= 0 ||
            typeof sesion.usuario.rol !== 'string' || !sesion.usuario.rol ||
            (sesion.expira !== null && !Number.isFinite(Date.parse(sesion.expira)))) {
            throw new Error('Respuesta de sesión inválida.');
        }
        return sesion;
    }

    async function verificar(ruta: RouteLocationNormalized) {
        const actual = ++revision;
        accesoVerificado.value = false;
        clearTimeout(temporizador);
        if (ruta.path === '/login') return true;
        try {
            // Se comparte únicamente la solicitud en curso; no se conserva un resultado anterior.
            const solicitud = enCurso ??= consultarSesion();
            let sesion: Sesion | null;
            try { sesion = await solicitud; }
            finally { if (enCurso === solicitud) enCurso = undefined; }
            if (actual !== revision) return false;
            if (!sesion) return { path: '/login', query: { motivo: 'sesion' } };
            const roles = ruta.meta.roles as readonly string[] | undefined;
            if (roles && !roles.includes(sesion.usuario.rol)) {
                return { path: '/login', query: { motivo: 'permiso' } };
            }
            if (sesion.expira) {
                const restante = Date.parse(sesion.expira) - Date.now();
                if (restante <= 0) return { path: '/login', query: { motivo: 'sesion' } };
                temporizador = setTimeout(() => { void revalidar(); }, Math.min(restante, 2147483647));
            }
            accesoVerificado.value = true;
            return true;
        } catch {
            if (actual !== revision) return false;
            return { path: '/login', query: { motivo: 'conexion' } };
        }
    }

    async function revalidar() {
        if (enCurso || !router.currentRoute.value.matched.length ||
            router.currentRoute.value.path === '/login') return;
        const resultado = await verificar(router.currentRoute.value);
        if (resultado !== true && resultado !== false) await router.replace(resultado);
    }

    const quitarGuard = router.beforeEach(verificar);
    const alRecuperarFoco = () => { if (!document.hidden) void revalidar(); };
    const alRestaurarPagina = (evento: PageTransitionEvent) => {
        if (evento.persisted) void revalidar();
    };
    window.addEventListener('focus', alRecuperarFoco);
    window.addEventListener('pageshow', alRestaurarPagina);
    return () => {
        quitarGuard(); clearTimeout(temporizador);
        window.removeEventListener('focus', alRecuperarFoco);
        window.removeEventListener('pageshow', alRestaurarPagina);
        invalidarAcceso();
    };
}
