
<template>
<nav class="module-nav">
    <RouterLink to="/historia-clinica">
        Panel
    </RouterLink>

    <a href="#ficha">
        Ficha del paciente
    </a>

    <a href="#alergias">
        Alergias
    </a>

    <a href="#antecedentes">
        Antecedentes
    </a>

    <a href="#evoluciones">
        Evoluciones
    </a>

    <a href="#estudios">
        Estudios
    </a>
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

@media (max-width: 800px) {
.module-nav {
padding: 12px 20px;
}
}
</style>
