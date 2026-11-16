<template>
<nav class="module-nav">
<RouterLink to="/enfermeria">
    Panel
</RouterLink>

<RouterLink to="/enfermeria/pacientes">
    Pacientes internados
</RouterLink>

<RouterLink to="/enfermeria/signos-vitales">
    Signos vitales
</RouterLink>

<RouterLink to="/enfermeria/medicacion">
    Medicación
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
}

.module-nav a {
padding: 8px 12px;
border-radius: 7px;
color: #60758a;
font-size: 11px;
text-decoration: none;
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