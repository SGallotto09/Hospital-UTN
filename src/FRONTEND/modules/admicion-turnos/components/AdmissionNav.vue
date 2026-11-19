<script setup lang="ts">
import { computed } from "vue";
import { rolActual } from "../../../../router/autenticacion";

type Rol =
    | "Administrador"
    | "Médico"
    | "Enfermero"
    | "Recepcionista"
    | "Limpieza";

interface Enlace {
    nombre: string;
    ruta: string;
    roles: Rol[];
}

const enlaces: Enlace[] = [
    {
        nombre: "Panel",
        ruta: "/admisiones/dashboard",
        roles: ["Administrador", "Recepcionista"]
    },
    {
        nombre: "Pacientes",
        ruta: "/admisiones/pacientes",
        roles: ["Administrador", "Recepcionista"]
    },
    {
        nombre: "Agenda médica",
        ruta: "/admisiones/agenda",
        roles: ["Administrador", "Recepcionista", "Médico"]
    },
    {
        nombre: "Turnos",
        ruta: "/admisiones/turnos",
        roles: ["Administrador", "Recepcionista"]
    },
    {
        nombre: "Lista de espera",
        ruta: "/admisiones/lista-espera",
        roles: ["Administrador", "Recepcionista"]
    },
    {
        nombre: "Triaje",
        ruta: "/admisiones/triaje",
        roles: ["Administrador", "Enfermero"]
    }
];

const enlacesVisibles = computed(() =>
    enlaces.filter(enlace =>
        rolActual.value !== null &&
        enlace.roles.includes(rolActual.value as Rol)
    )
);
</script>

<template>
    <nav class="module-nav">
        <RouterLink
            v-for="enlace in enlacesVisibles"
            :key="enlace.ruta"
            :to="enlace.ruta"
            exact-active-class="router-link-exact-active"
        >
            {{ enlace.nombre }}
        </RouterLink>
    </nav>
</template>

<style scoped>
.module-nav {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 30px;
    background: white;
    border-bottom: 1px solid #e5ebf1;
    overflow-x: auto;
}

.module-nav a {
    padding: 8px 12px;
    border-radius: 7px;
    color: #60758a;
    font-size: 12px;
    text-decoration: none;
    white-space: nowrap;
    transition: 0.15s ease;
}

.module-nav a:hover {
    background: #f1f7fb;
    color: #087fc4;
}

.module-nav a.router-link-exact-active {
    background: #e5f5ff;
    color: #087fc4;
    font-weight: 600;
}
</style>