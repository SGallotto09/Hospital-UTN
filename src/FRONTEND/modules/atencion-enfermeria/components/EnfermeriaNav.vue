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
        ruta: "/enfermeria",
        roles: ["Administrador", "Enfermero"]
    },
    {
        nombre: "Pacientes internados",
        ruta: "/enfermeria/pacientes",
        roles: ["Administrador", "Médico", "Enfermero"]
    },
    {
        nombre: "Signos vitales",
        ruta: "/enfermeria/signos-vitales",
        roles: ["Administrador", "Enfermero"]
    },
    {
        nombre: "Medicación",
        ruta: "/enfermeria/medicacion",
        roles: ["Administrador", "Enfermero"]
    },
    {
        nombre: "Protocolos",
        ruta: "/enfermeria/protocolos",
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
        >
            {{ enlace.nombre }}
        </RouterLink>
    </nav>
</template>

<style scoped>
.module-nav {
    display: flex;
    gap: 8px;
    padding: 14px 42px;
    background: white;
    border-bottom: 1px solid #e5ebf1;
    overflow-x: auto;
}

.module-nav a {
    padding: 8px 12px;
    border-radius: 7px;
    color: #60758a;
    font-size: 11px;
    text-decoration: none;
    white-space: nowrap;
}

.module-nav a:hover {
    background: #f1f7fb;
    color: #087fc4;
}

.module-nav a.router-link-active {
    background: #e5f5ff;
    color: #087fc4;
    font-weight: 600;
}
</style>