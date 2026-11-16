<script setup lang="ts">
import { useRoute } from 'vue-router';
import { accesoVerificado } from './router/autenticacion';
const ruta = useRoute();
</script>

<template>
    <RouterView v-if="ruta.path === '/login' || accesoVerificado" />
    <p v-else role="status">Verificando sesión...</p>
</template>

<style scoped></style>
