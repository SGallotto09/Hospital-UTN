
<script setup lang="ts">

import { RouterView } from "vue-router";

import AdmissionNav from "../modules/admicion-turnos/components/AdmissionNav.vue";

</script>


<template>

    <div class="admission-layout">

        <!-- NAV SUPERIOR DEL MODULO -->
        <AdmissionNav />


        <!-- CONTENIDO DE CADA PANTALLA -->
        <main class="admission-content">

            <RouterView />

        </main>

    </div>

</template>


<style scoped>

.admission-layout {
    width: 100%;
    min-height: 100vh;
    background: #f5f8fb;
}

.admission-content {
    width: 100%;
    min-height: calc(100vh - 55px);
}

</style>
