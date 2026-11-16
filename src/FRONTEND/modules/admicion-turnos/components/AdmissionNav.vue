
<template>
    <nav class="module-nav">

        <RouterLink
            to="/admisiones"
            exact-active-class="router-link-exact-active"
        >
            Panel
        </RouterLink>

        <RouterLink
            to="/admisiones/pacientes"
            exact-active-class="router-link-exact-active"
        >
            Pacientes
        </RouterLink>

        <RouterLink
            to="/admisiones/agenda"
            exact-active-class="router-link-exact-active"
        >
            Agenda médica
        </RouterLink>

        <RouterLink
            to="/admisiones/turnos"
            exact-active-class="router-link-exact-active"
        >
            Turnos
        </RouterLink>

        <RouterLink
            to="/admisiones/lista-espera"
            exact-active-class="router-link-exact-active"
        >
            Lista de espera
        </RouterLink>

        <RouterLink
            to="/admisiones/triaje"
            exact-active-class="router-link-exact-active"
        >
            Triaje
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
