
<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter, useRoute } from "vue-router";

const router = useRouter();
const ruta = useRoute();
const avisoSesion = computed(() => {
    if (ruta.query.motivo === 'conexion') return 'No se pudo verificar la sesión. Comprobá la conexión con el servidor e intentá nuevamente.';
    if (ruta.query.motivo === 'permiso') return 'Tu rol no tiene permiso para acceder a esa pantalla.';
    if (ruta.query.motivo === 'sesion') return 'La sesión no está vigente. Iniciá sesión para continuar.';
    return '';
});
const usuario = ref("");
const password = ref("");
const mostrarPassword = ref(false);
const mensaje = ref("");
const ingresando = ref(false);

async function iniciarSesion() {
    if (ingresando.value) return;
    mensaje.value = "";
    ingresando.value = true;

    try {
        const respuesta = await fetch("/api/auth/login", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                usuario: usuario.value,
                contrasenia: password.value,
            }),
        });

        if (respuesta.status !== 200) {
            mensaje.value = respuesta.status === 401
                ? "Usuario o contraseña incorrectos."
                : "No se pudo iniciar sesión. Intentá nuevamente.";
            return;
        }

        password.value = "";
        // Destino provisional hasta que el grupo defina la pantalla inicial.
        await router.replace("/recursos-camas");
    } catch {
        mensaje.value = "No se pudo conectar con el sistema. Intentá nuevamente.";
    } finally {
        ingresando.value = false;
    }
}

</script>

<template>
<main class="login-page">
    <!-- Panel institucional -->
    <section class="brand-panel">
    <div class="brand-header">
        <div class="brand-logo">
        <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <rect x="17" y="2" width="14" height="44" rx="4" fill="#38BDF8"/>
            <rect x="2" y="17" width="44" height="14" rx="4" fill="#38BDF8"/>
            <rect x="17" y="17" width="14" height="14" rx="2" fill="#DBF4FF"/>
        </svg>
        </div>

        <div class="brand-text">
        <h2>Hospital-UTN</h2>
        <p>Sistema de Gestión Hospitalaria</p>
        </div>
    </div>

    <div class="brand-content">
        <div class="brand-badge">
        <span class="badge-dot"></span>
        Plataforma institucional
        </div>

        <h1>
        La gestión de la salud,
        <span>en un solo lugar.</span>
        </h1>

        <p class="brand-description">
        Una plataforma centralizada para gestionar pacientes,
        profesionales y procesos hospitalarios de manera segura y eficiente.
        </p>

        <div class="feature-list">
        <div class="feature-item">
            <div class="feature-icon">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                d="M12 3 20 6V11C20 16 16.5 19.5 12 21C7.5 19.5 4 16 4 11V6L12 3Z"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linejoin="round"
                />
                <path
                d="m9 12 2 2 4-4"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                />
            </svg>
            </div>
            <div>
            <strong>Acceso seguro</strong>
            <span>Protección de la información hospitalaria.</span>
            </div>
        </div>

        <div class="feature-item">
            <div class="feature-icon">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                d="M16 21V19C16 16.8 14.2 15 12 15H6C3.8 15 2 16.8 2 19V21M9 11C11.2 11 13 9.2 13 7S11.2 3 9 3 5 4.8 5 7 6.8 11 9 11ZM19 8V14M16 11H22"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                />
            </svg>
            </div>
            <div>
            <strong>Gestión de usuarios</strong>
            <span>Roles y permisos según cada responsabilidad.</span>
            </div>
        </div>

        <div class="feature-item">
            <div class="feature-icon">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect
                x="3"
                y="4"
                width="18"
                height="17"
                rx="3"
                stroke="currentColor"
                stroke-width="1.8"
                />
                <path
                d="M8 2V6M16 2V6M3 10H21M8 14H11M8 17H15"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                />
            </svg>
            </div>
            <div>
            <strong>Información centralizada</strong>
            <span>Herramientas organizadas en un mismo sistema.</span>
            </div>
        </div>
        </div>
    </div>

    <footer class="brand-footer">
        <span class="footer-line"></span>
        <span>Hospital-UTN · Plataforma institucional</span>
    </footer>

    <div class="decorative-circle circle-one"></div>
    <div class="decorative-circle circle-two"></div>
    <div class="decorative-grid"></div>
    </section>

    <!-- Panel de inicio de sesión -->
    <section class="form-panel">
    <header class="form-topbar">
        <span class="portal-label">PORTAL INSTITUCIONAL</span>

        <div class="system-status">
        <span class="status-dot"></span>
        Portal de acceso
        </div>
    </header>

    <div class="login-content">
        <div class="login-card">
        <div class="login-icon">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M12 3 20 6V11C20 16 16.5 19.5 12 21C7.5 19.5 4 16 4 11V6L12 3Z"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linejoin="round"
            />
            <path
                d="M12 8V14M9 11H15"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
            />
            </svg>
        </div>

        <p class="welcome-label">BIENVENIDO DE NUEVO</p>
        <h1>Iniciar sesión</h1>
        <p class="login-description">
            Ingresá tus credenciales para acceder al sistema hospitalario.
        </p>

        <form @submit.prevent="iniciarSesion">
            <div class="form-group">
            <label for="usuario">Usuario</label>

            <div class="input-wrapper">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect
                    x="3"
                    y="5"
                    width="18"
                    height="14"
                    rx="3"
                    stroke="currentColor"
                    stroke-width="1.7"
                />
                <path
                    d="m4 7 8 6 8-6"
                    stroke="currentColor"
                    stroke-width="1.7"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
                </svg>

                <input
                id="usuario"
                v-model.trim="usuario"
                type="text"
                placeholder="Ingresá tu usuario"
                autocomplete="username"
                required
                />
            </div>
            </div>

            <div class="form-group">
            <label for="password">Contraseña</label>

            <div class="input-wrapper">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect
                    x="4"
                    y="10"
                    width="16"
                    height="11"
                    rx="2.5"
                    stroke="currentColor"
                    stroke-width="1.7"
                />
                <path
                    d="M8 10V7a4 4 0 0 1 8 0v3M12 14V17"
                    stroke="currentColor"
                    stroke-width="1.7"
                    stroke-linecap="round"
                />
                </svg>

                <input
                id="password"
                v-model="password"
                :type="mostrarPassword ? 'text' : 'password'"
                placeholder="Ingresá tu contraseña"
                autocomplete="current-password"
                required
                />

                <button
                class="toggle-password"
                type="button"
                :aria-label="mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                @click="mostrarPassword = !mostrarPassword"
                >
                <svg
                    v-if="!mostrarPassword"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                >
                    <path
                    d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
                    stroke="currentColor"
                    stroke-width="1.7"
                    />
                    <circle
                    cx="12"
                    cy="12"
                    r="3"
                    stroke="currentColor"
                    stroke-width="1.7"
                    />
                </svg>
                <svg
                    v-else
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                >
                    <path
                    d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.8A10 10 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3 3.7M6.2 6.2C3.7 7.8 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1 0 2-.2 2.8-.5"
                    stroke="currentColor"
                    stroke-width="1.7"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    />
                </svg>
                </button>
            </div>
            </div>

            <p v-if="mensaje || avisoSesion" class="feedback-message" role="status">
            {{ mensaje || avisoSesion }}
            </p>

            <button class="submit-button" type="submit" :disabled="ingresando" :aria-busy="ingresando">
            <span>{{ ingresando ? "Ingresando…" : "Ingresar al sistema" }}</span>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                d="M5 12H19M12 5L19 12L12 19"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                />
            </svg>
            </button>
        </form>

        <div class="security-note">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M12 3 20 6V11C20 16 16.5 19.5 12 21C7.5 19.5 4 16 4 11V6L12 3Z"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linejoin="round"
            />
                <path
                d="m9 12 2 2 4-4"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
                />
            </svg>
            <span>Acceso exclusivo para usuarios autorizados.</span>
        </div>
        </div>

        <footer class="form-footer">
        <p>¿Problemas para ingresar?</p>
        <span>Contactá al administrador del sistema.</span>
        </footer>
    </div>

    <div class="copyright">
        © 2026 Hospital-UTN. Todos los derechos reservados.
    </div>
    </section>
</main>
</template>

<style scoped>
:global(*) {
box-sizing: border-box;
}

:global(html),
:global(body),
:global(#app) {
min-height: 100%;
margin: 0;
}

:global(body) {
font-family: Inter, "Segoe UI", Arial, sans-serif;
color: #14233d;
-webkit-font-smoothing: antialiased;
}

:global(button),
:global(input) {
font: inherit;
}

.login-page {
    display: grid;
    grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
    height: 100vh;
    min-height: 0;
    overflow: hidden;
    background: #f5f8fc;
}

/* PANEL INSTITUCIONAL */

.brand-panel {
position: relative;
isolation: isolate;
display: flex;
flex-direction: column;
height: 100%;
min-height: 0;
padding: 36px clamp(28px, 4vw, 64px) 24px;
overflow: hidden;
color: #fff;
background: linear-gradient(145deg, #102c46 0%, #0c2035 52%, #07182b 100%);
}

.brand-header,
.brand-content,
.brand-footer {
position: relative;
z-index: 2;
}

.brand-header {
display: flex;
align-items: center;
gap: 13px;
}

.brand-logo {
display: grid;
width: 49px;
height: 49px;
flex-shrink: 0;
place-items: center;
}

.brand-logo svg {
width: 46px;
height: 46px;
}

.brand-text h2 {
margin: 0 0 4px;
font-size: 22px;
font-weight: 750;
letter-spacing: -0.6px;
}

.brand-text p {
margin: 0;
color: #a9bfd5;
font-size: 12px;
}

.brand-content {
width: 100%;
max-width: 490px;
margin: auto 0;
padding: 56px 0 65px;
}

.brand-badge {
display: inline-flex;
align-items: center;
gap: 9px;
padding: 9px 13px;
border: 1px solid rgb(125 211 252 / 23%);
border-radius: 30px;
background: rgb(56 189 248 / 9%);
color: #c1eafa;
font-size: 12px;
font-weight: 600;
}

.badge-dot,
.status-dot {
width: 7px;
height: 7px;
border-radius: 50%;
background: #38bdf8;
}

.brand-content h1 {
max-width: 480px;
margin: 27px 0 20px;
font-size: clamp(34px, 3.3vw, 51px);
line-height: 1.16;
font-weight: 760;
letter-spacing: -1.9px;
}

.brand-content h1 span {
display: block;
color: #43c4f6;
}

.brand-description {
max-width: 420px;
margin: 0;
color: #b2c3d7;
font-size: 15px;
line-height: 1.85;
}

.feature-list {
display: grid;
gap: 25px;
margin-top: 42px;
}

.feature-item {
display: flex;
align-items: center;
gap: 15px;
}

.feature-icon {
display: grid;
width: 45px;
height: 45px;
flex-shrink: 0;
place-items: center;
border: 1px solid rgb(125 211 252 / 18%);
border-radius: 13px;
background: rgb(56 189 248 / 9%);
color: #50c8f6;
}

.feature-icon svg {
width: 23px;
height: 23px;
}

.feature-item strong,
.feature-item span {
display: block;
}

.feature-item strong {
margin-bottom: 5px;
font-size: 13px;
font-weight: 650;
}

.feature-item span {
color: #9eb4ca;
font-size: 12px;
line-height: 1.5;
}

.brand-footer {
display: flex;
align-items: center;
gap: 12px;
color: #8da5bd;
font-size: 11px;
}

.footer-line {
width: 24px;
height: 2px;
border-radius: 2px;
background: #38bdf8;
}

.decorative-circle {
position: absolute;
z-index: -1;
border: 1px solid rgb(125 211 252 / 8%);
border-radius: 50%;
pointer-events: none;
}

.circle-one {
top: 14%;
right: -180px;
width: 370px;
height: 370px;
box-shadow:
    0 0 0 42px rgb(125 211 252 / 2%),
    0 0 0 84px rgb(125 211 252 / 2%);
}

.circle-two {
bottom: 4%;
left: -160px;
width: 290px;
height: 290px;
box-shadow: 0 0 0 38px rgb(125 211 252 / 2%);
}

.decorative-grid {
position: absolute;
z-index: -1;
right: 25px;
bottom: 34px;
width: 140px;
height: 120px;
opacity: 0.12;
background-image: radial-gradient(#71c8ee 1px, transparent 1px);
background-size: 15px 15px;
}

/* PANEL DEL FORMULARIO */

.form-panel {
position: relative;
display: flex;
flex-direction: column;
min-width: 0;
height: 100%;
min-height: 0;
padding: 26px clamp(24px, 4vw, 58px) 22px;
background:
    radial-gradient(ellipse at 85% 10%, rgb(219 234 254 / 32%), transparent 38%),
    #f7f9fc;
}

.form-topbar {
display: flex;
align-items: center;
justify-content: space-between;
gap: 14px;
}

.portal-label {
color: #8190a6;
font-size: 10px;
font-weight: 750;
letter-spacing: 1.5px;
}

.system-status {
display: inline-flex;
align-items: center;
gap: 8px;
color: #718198;
font-size: 11px;
white-space: nowrap;
}

.system-status .status-dot {
background: #22c55e;
box-shadow: 0 0 0 4px rgb(34 197 94 / 10%);
}

.login-content {
display: flex;
flex: 1;
flex-direction: column;
align-items: center;
justify-content: center;
width: 100%;
padding: 42px 0 30px;
}

.login-card {
width: 100%;
max-width: 420px;
padding: 37px 34px 29px;
border: 1px solid #e8edf4;
border-radius: 19px;
background: #fff;
box-shadow:
    0 18px 55px rgb(20 41 69 / 5%),
    0 3px 10px rgb(20 41 69 / 2%);
}

.login-icon {
display: grid;
width: 55px;
height: 55px;
margin-bottom: 25px;
place-items: center;
border: 1px solid #d9eaff;
border-radius: 16px;
background: linear-gradient(145deg, #eef7ff, #dbeafe);
color: #0875db;
}

.login-icon svg {
width: 28px;
height: 28px;
}

.welcome-label {
margin: 0 0 9px;
color: #1481dc;
font-size: 10px;
font-weight: 750;
letter-spacing: 1.65px;
}

.login-card h1 {
margin: 0;
color: #13233e;
font-size: 30px;
font-weight: 760;
letter-spacing: -1px;
}

.login-description {
margin: 12px 0 30px;
color: #7a899e;
font-size: 13px;
line-height: 1.7;
}

.form-group {
margin-bottom: 21px;
}

.form-group > label {
display: block;
margin-bottom: 9px;
color: #253750;
font-size: 12px;
font-weight: 650;
}

.input-wrapper {
display: flex;
align-items: center;
gap: 11px;
width: 100%;
height: 48px;
padding: 0 13px;
border: 1px solid #dce4ef;
border-radius: 9px;
background: #fff;
transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.input-wrapper:focus-within {
border-color: #1684e8;
box-shadow: 0 0 0 3px rgb(22 132 232 / 10%);
}

.input-wrapper > svg {
width: 19px;
height: 19px;
flex-shrink: 0;
color: #8291a7;
}

.input-wrapper input {
width: 100%;
min-width: 0;
height: 100%;
padding: 0;
border: 0;
outline: 0;
background: transparent;
color: #1a2b44;
font-size: 12px;
}

.input-wrapper input::placeholder {
color: #a4afbf;
}

.toggle-password {
display: grid;
width: 30px;
height: 34px;
flex-shrink: 0;
padding: 0;
place-items: center;
border: 0;
border-radius: 6px;
background: transparent;
color: #8493a8;
cursor: pointer;
}

.toggle-password:hover {
background: #f1f6fc;
color: #0875db;
}

.toggle-password svg {
width: 19px;
height: 19px;
}

.feedback-message {
margin: -7px 0 17px;
padding: 11px 12px;
border: 1px solid #cfe4ff;
border-radius: 8px;
background: #f0f7ff;
color: #185b9c;
font-size: 12px;
line-height: 1.6;
}

.submit-button {
display: flex;
align-items: center;
justify-content: center;
gap: 13px;
width: 100%;
min-height: 49px;
padding: 13px 17px;
border: 0;
border-radius: 9px;
background: linear-gradient(100deg, #0879d9, #078fca);
box-shadow: 0 5px 13px rgb(8 121 217 / 20%);
color: #fff;
font-size: 13px;
font-weight: 700;
cursor: pointer;
transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    filter 0.2s ease;
}

.submit-button:hover {
transform: translateY(-1px);
box-shadow: 0 8px 19px rgb(8 121 217 / 27%);
filter: brightness(1.04);
}

.submit-button:active {
transform: translateY(0);
}

.submit-button svg {
width: 18px;
height: 18px;
}

.security-note {
display: flex;
align-items: center;
justify-content: center;
gap: 8px;
margin-top: 25px;
color: #8997aa;
font-size: 10px;
line-height: 1.6;
text-align: center;
}

.security-note svg {
width: 17px;
height: 17px;
flex-shrink: 0;
color: #2990d9;
}

.form-footer {
margin-top: 25px;
color: #8a97a9;
font-size: 11px;
line-height: 1.7;
text-align: center;
}

.form-footer p {
display: inline;
margin: 0 4px 0 0;
}

.form-footer span {
color: #586d87;
font-weight: 600;
}

.copyright {
color: #9aa6b7;
font-size: 10px;
text-align: center;
}

/* RESPONSIVE */

@media (max-width: 1050px) {
.login-page {
    grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
}

.brand-panel {
    padding-right: 28px;
    padding-left: 28px;
}

.brand-content h1 {
    font-size: clamp(32px, 4vw, 42px);
}

.form-panel {
    padding-right: 28px;
    padding-left: 28px;
}

.login-card {
    padding: 31px 26px 26px;
}
}

@media (max-width: 760px) {
.login-page {
    grid-template-columns: 1fr;
}

.brand-panel {
    min-height: auto;
    padding: 22px 24px 26px;
}

.brand-logo,
.brand-logo svg {
    width: 40px;
    height: 40px;
}

.brand-text h2 {
    font-size: 19px;
}

.brand-content {
    max-width: 560px;
    margin: 28px auto 0;
    padding: 12px 0 26px;
}

.brand-content h1 {
    max-width: 470px;
    margin: 20px 0 12px;
    font-size: clamp(30px, 7vw, 40px);
    letter-spacing: -1.2px;
}

.brand-description {
    font-size: 13px;
}

.feature-list {
    grid-template-columns: 1fr;
    gap: 15px;
    margin-top: 24px;
}

.feature-item {
    gap: 12px;
}

.feature-icon {
    width: 39px;
    height: 39px;
    border-radius: 11px;
}

.feature-item span {
    font-size: 11px;
}

.brand-footer {
    margin-top: 5px;
}

.form-panel {
    min-height: auto;
    padding: 23px 20px 18px;
}

.login-content {
    padding: 32px 0 26px;
}

.login-card {
    max-width: 440px;
}

.copyright {
    margin-top: 0;
}

.circle-one {
    top: auto;
    right: -180px;
    bottom: -140px;
}

.circle-two,
.decorative-grid {
    display: none;
}
}

@media (max-width: 400px) {
.brand-panel {
    padding-right: 19px;
    padding-left: 19px;
}

.form-panel {
    padding-right: 14px;
    padding-left: 14px;
}

.form-topbar {
    align-items: flex-start;
}

.portal-label {
    font-size: 9px;
}

.system-status {
    font-size: 10px;
}

.login-card {
    padding: 27px 20px 23px;
}

.login-card h1 {
    font-size: 27px;
}

}

@media (min-width: 761px) and (max-height: 800px) {
    .brand-content {
        padding: 25px 0;
    }

    .feature-list {
        gap: 16px;
        margin-top: 25px;
    }

    .form-panel {
        padding-top: 16px;
        padding-bottom: 12px;
    }

    .login-content {
        padding-top: 15px;
        padding-bottom: 15px;
    }

    .login-card {
        padding-top: 24px;
        padding-bottom: 20px;
    }

    .login-icon {
        margin-bottom: 16px;
    }

    .login-description {
        margin-bottom: 20px;
    }

    .form-group {
        margin-bottom: 14px;
    }

    .security-note {
        margin-top: 16px;
    }

    .form-footer {
        margin-top: 12px;
    }
}
</style>
