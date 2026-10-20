<script setup lang="ts">
import { computed, ref } from "vue";

interface Alerta {
id: number;
paciente: string;
habitacion: string;
tipo: string;
mensaje: string;
hora: string;
prioridad: "Alta" | "Media";
resuelta: boolean;
}

const alertas = ref<Alerta[]>([
{
id: 1,
paciente: "Pedro Gómez",
habitacion: "206",
tipo: "Temperatura elevada",
mensaje: "Temperatura registrada de 39.4 °C.",
hora: "14:15",
prioridad: "Alta",
resuelta: false,
},
{
id: 2,
paciente: "Ana Rojas",
habitacion: "205",
tipo: "Control pendiente",
mensaje: "El control de signos vitales se encuentra pendiente.",
hora: "14:00",
prioridad: "Media",
resuelta: false,
},
]);

const alertasPendientes = computed(() => {
return alertas.value.filter((alerta) => !alerta.resuelta);
});

function resolverAlerta(alerta: Alerta) {
alerta.resuelta = true;
}
</script>

<template>
<div class="page">
<RouterLink
    to="/enfermeria"
    class="back-button"
    >
    ← Volver al panel
</RouterLink>
<header class="page-header">
    <div>
    <span class="section-label">MONITOREO</span>

    <h1>Alertas</h1>

    <p>
        Alertas generadas durante el monitoreo de pacientes internados.
    </p>
    </div>

    <div class="alert-count">
    <strong>{{ alertasPendientes.length }}</strong>
    <span>activas</span>
    </div>
</header>

<section
    v-if="alertasPendientes.length > 0"
    class="alerts-list"
>
    <article
    v-for="alerta in alertasPendientes"
    :key="alerta.id"
    class="alert-card"
    :class="{
        high: alerta.prioridad === 'Alta'
    }"
    >
    <div class="alert-icon">
        !
    </div>

    <div class="alert-main">
        <div class="alert-title">
        <div>
            <span class="priority">
            Prioridad {{ alerta.prioridad }}
            </span>

            <h2>{{ alerta.tipo }}</h2>
        </div>

        <span class="time">
            {{ alerta.hora }}
        </span>
        </div>

        <div class="patient">
        <strong>{{ alerta.paciente }}</strong>

        <span>
            Habitación {{ alerta.habitacion }}
        </span>
        </div>

        <p>
        {{ alerta.mensaje }}
        </p>
    </div>

    <button
        class="resolve-button"
        @click="resolverAlerta(alerta)"
    >
        Marcar resuelta
    </button>
    </article>
</section>

<section
    v-else
    class="empty"
>
    <div class="empty-icon">✓</div>

    <h2>No hay alertas activas</h2>

    <p>
    Todos los pacientes se encuentran sin alertas pendientes.
    </p>
</section>

<section class="alert-info">
    <strong>Alertas de alta prioridad</strong>

    <p>
    Los parámetros críticos, como una temperatura superior a
    39 °C, deberán generar una notificación prioritaria al
    médico de guardia correspondiente al sector.
    </p>
</section>
</div>
</template>

<style scoped>
.back-button {
padding: 10px 14px;
border: 1px solid #dce5eb;
border-radius: 7px;
background: white;
color: #526879;
font-size: 12px;
font-weight: 600;
text-decoration: none;
}

.back-button:hover {
border-color: #087fc4;
color: #087fc4;
}
.page {
min-height: calc(100vh - 70px);
padding: 32px 42px;
background: #f7f9fb;
}

.page-header {
display: flex;
justify-content: space-between;
align-items: flex-end;
margin-bottom: 28px;
margin-top: 20px;
}

.section-label {
color: #087fc4;
font-size: 10px;
font-weight: 700;
letter-spacing: 1.3px;
}

h1 {
margin: 7px 0;
color: #163247;
font-size: 28px;
}

.page-header p {
margin: 0;
color: #718496;
}

.alert-count {
display: flex;
flex-direction: column;
align-items: center;
padding: 13px 22px;
border: 1px solid #f0dada;
border-radius: 10px;
background: white;
}

.alert-count strong {
color: #d83b3b;
font-size: 23px;
}

.alert-count span {
color: #718496;
font-size: 11px;
}

.alerts-list {
display: flex;
flex-direction: column;
gap: 14px;
}

.alert-card {
display: flex;
align-items: center;
gap: 18px;
padding: 20px;
background: white;
border: 1px solid #f0dddd;
border-left: 4px solid #d99a28;
border-radius: 10px;
}

.alert-card.high {
border-left-color: #d83b3b;
}

.alert-icon {
width: 42px;
height: 42px;
flex-shrink: 0;
display: flex;
align-items: center;
justify-content: center;
border-radius: 50%;
background: #fff0f0;
color: #d83b3b;
font-size: 20px;
font-weight: 700;
}

.alert-main {
flex: 1;
}

.alert-title {
display: flex;
justify-content: space-between;
align-items: flex-start;
}

.priority {
color: #d83b3b;
font-size: 10px;
font-weight: 700;
text-transform: uppercase;
}

.alert-title h2 {
margin: 5px 0 8px;
color: #263f51;
font-size: 16px;
}

.time {
color: #8a99a6;
font-size: 11px;
}

.patient {
display: flex;
gap: 12px;
align-items: center;
}

.patient strong {
color: #263f51;
font-size: 12px;
}

.patient span {
color: #7d8d9b;
font-size: 11px;
}

.alert-main p {
margin: 10px 0 0;
color: #718496;
font-size: 12px;
}

.resolve-button {
padding: 9px 13px;
border: 1px solid #dce5eb;
border-radius: 7px;
background: white;
color: #526879;
font-size: 11px;
font-weight: 600;
cursor: pointer;
}

.resolve-button:hover {
border-color: #087fc4;
color: #087fc4;
}

.empty {
padding: 60px 20px;
text-align: center;
background: white;
border: 1px solid #e5ebf1;
border-radius: 12px;
}

.empty-icon {
width: 50px;
height: 50px;
margin: 0 auto 15px;
display: flex;
align-items: center;
justify-content: center;
border-radius: 50%;
background: #e8f7ef;
color: #238452;
font-size: 24px;
font-weight: 700;
}

.empty h2 {
margin: 0 0 7px;
color: #263f51;
font-size: 18px;
}

.empty p {
margin: 0;
color: #8293a1;
font-size: 12px;
}

.alert-info {
margin-top: 22px;
padding: 16px;
border-radius: 9px;
background: #fff5f5;
}

.alert-info strong {
color: #c83b3b;
font-size: 12px;
}

.alert-info p {
margin: 5px 0 0;
color: #806464;
font-size: 11px;
line-height: 1.5;
}

@media (max-width: 800px) {
.page {
padding: 24px;
}

.alert-card {
align-items: flex-start;
flex-wrap: wrap;
}

.resolve-button {
margin-left: 60px;
}
}
</style>