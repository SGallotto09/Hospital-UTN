<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const cerrandoSesion = ref(false);
const errorSalida = ref("");

async function cerrarSesion() {
    if (cerrandoSesion.value) return;
    errorSalida.value = "";
    cerrandoSesion.value = true;

    try {
        const respuesta = await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "same-origin",
        });

        if (respuesta.status !== 200) {
            errorSalida.value = "No se pudo cerrar sesión. Intentá nuevamente.";
            return;
        }

        await router.replace("/login");
    } catch {
        errorSalida.value = "No se pudo conectar para cerrar sesión. Intentá nuevamente.";
    } finally {
        cerrandoSesion.value = false;
    }
}
</script>

<template>
<div class="layout">

<!-- SIDEBAR GENERAL -->
<aside class="sidebar">

    <!-- LOGO -->
    <div class="brand">
    <div class="brand-icon">
        H
    </div>

    <div class="brand-text">
        <strong>Hospital-UTN</strong>
        <span>Sistema de gestión</span>
    </div>
    </div>

    <!-- NAVEGACIÓN -->
    <nav class="main-nav">

    <!-- INICIO -->
    <RouterLink to="/" class="nav-link">
        <span class="nav-icon">⌂</span>
        <span>Inicio</span>
    </RouterLink>

    <!-- MÓDULOS -->
    <RouterLink to="/admisiones" class="nav-link module-link">
        <span class="nav-icon">▣</span>
        <span>Admisión y turnos</span>
    </RouterLink>

    <RouterLink to="/historia-clinica" class="nav-link">
        <span class="nav-icon">▤</span>
        <span>Historia clínica</span>
    </RouterLink>

    <RouterLink to="/enfermeria" class="nav-link">
        <span class="nav-icon">♥</span>
        <span>Atención y enfermería</span>
    </RouterLink>

    <RouterLink to="/recursos-camas" class="nav-link">
        <span class="nav-icon" aria-hidden="true">▤</span>
        <span>Recursos y camas</span>
    </RouterLink>

    <RouterLink to="/facturacion" class="nav-link">
        <span class="nav-icon">$</span>
        <span>Facturación</span>
    </RouterLink>

    </nav>

    <!-- USUARIO -->
    <div class="sidebar-user">

    <div class="user-avatar">
        H
    </div>

    <div class="user-info">
        <strong>Hospital-UTN</strong>
        <span>Acceso al sistema</span>
        <span v-if="errorSalida" role="alert">{{ errorSalida }}</span>
    </div>

    <button
        class="logout-button"
        type="button"
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
        :disabled="cerrandoSesion"
        :aria-busy="cerrandoSesion"
        @click="cerrarSesion"
    >
        ↪
    </button>

    </div>

</aside>

<!-- CONTENIDO -->
<main class="main-content">
    <RouterView />
</main>

</div>
</template>

<style scoped>
/* =========================
LAYOUT
========================= */

.layout {
display: flex;
min-height: 100vh;
background: #f5f8fb;
}

/* =========================
SIDEBAR
========================= */

.sidebar {
position: fixed;

top: 0;
left: 0;
bottom: 0;

width: 250px;

display: flex;
flex-direction: column;

background: #087fc4;

z-index: 100;
}

/* =========================
BRAND
========================= */

.brand {
display: flex;
align-items: center;
gap: 11px;

padding: 22px 20px;

border-bottom: 1px solid rgba(255, 255, 255, 0.15);
}

.brand-icon {
width: 36px;
height: 36px;

display: flex;
align-items: center;
justify-content: center;

border-radius: 9px;

background: white;
color: #087fc4;

font-size: 18px;
font-weight: 700;
}

.brand-text strong {
display: block;

color: white;

font-size: 14px;
}

.brand-text span {
display: block;

margin-top: 3px;

color: rgba(255, 255, 255, 0.7);

font-size: 10px;
}

/* =========================
NAVEGACIÓN
========================= */

.main-nav {
flex: 1;

padding: 22px 12px;
}

.nav-link {
display: flex;
align-items: center;
gap: 11px;

padding: 11px 12px;

margin-bottom: 4px;

border-radius: 8px;

color: rgba(255, 255, 255, 0.85);

font-size: 12px;
font-weight: 500;

text-decoration: none;

transition: 0.15s ease;
}

/* Separación entre Inicio y los módulos */
.module-link {
margin-top: 24px;
}

.nav-link:hover {
background: rgba(255, 255, 255, 0.12);

color: white;
}

.nav-link.router-link-active {
background: white;

color: #087fc4;

font-weight: 600;
}

.nav-icon {
width: 20px;

display: inline-flex;

justify-content: center;
align-items: center;

font-size: 15px;
}

/* =========================
USUARIO
========================= */

.sidebar-user {
display: flex;
align-items: center;
gap: 10px;

padding: 16px;

border-top: 1px solid rgba(255, 255, 255, 0.15);
}

.user-avatar {
width: 35px;
height: 35px;

display: flex;
align-items: center;
justify-content: center;

flex-shrink: 0;

border-radius: 50%;

background: white;

color: #087fc4;

font-size: 11px;
font-weight: 700;
}

.user-info {
flex: 1;

min-width: 0;
}

.user-info strong {
display: block;

color: white;

font-size: 11px;

white-space: nowrap;
overflow: hidden;
text-overflow: ellipsis;
}

.user-info span {
display: block;

margin-top: 3px;

color: rgba(255, 255, 255, 0.65);

font-size: 10px;
}

.logout-button {
border: none;

background: transparent;

color: rgba(255, 255, 255, 0.7);

font-size: 17px;

cursor: pointer;
}

.logout-button:hover {
color: white;
}

/* =========================
CONTENIDO
========================= */

.main-content {
width: calc(100% - 250px);

min-height: 100vh;

margin-left: 250px;
}

/* =========================
RESPONSIVE
========================= */

@media (max-width: 900px) {
.sidebar {
width: 220px;
}

.main-content {
width: calc(100% - 220px);

margin-left: 220px;
}
}
</style>
