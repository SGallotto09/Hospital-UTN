<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <nav class="module-nav" aria-label="Recursos y camas">
    <RouterLink to="/recursos-camas">Mapa de camas</RouterLink>
    <RouterLink to="/recursos-camas/inventario">Inventario de insumos</RouterLink>
  </nav>
</template>

<style scoped>
.module-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 14px 42px;
  background: white;
  border-bottom: 1px solid #e5ebf1;
  font-family:
    Inter,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
}
.module-nav a {
  padding: 8px 12px;
  border-radius: 7px;
  color: #60758a;
  font-size: 11px;
  font-weight: 500;
  text-decoration: none;
}
.module-nav a:hover,
.module-nav a.router-link-exact-active {
  background: #e5f5ff;
  color: #087fc4;
}
.module-nav a.router-link-exact-active {
  font-weight: 600;
}
.module-nav a:focus-visible {
  outline: 2px solid #087fc4;
  outline-offset: 3px;
}
@media (max-width: 900px) {
  .module-nav {
    padding: 14px 24px;
  }
}
@media (max-width: 600px) {
  .module-nav {
    padding: 12px;
    gap: 4px;
  }
}
</style>
