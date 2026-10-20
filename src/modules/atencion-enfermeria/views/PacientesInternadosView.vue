<script setup lang="ts">
import { computed, ref } from "vue";

interface Paciente {
id: number;
nombre: string;
apellido: string;
habitacion: string;
diagnostico: string;
estado: string;
temperatura: number;
frecuenciaCardiaca: number;
presionArterial: string;
}

const pacientes = ref<Paciente[]>([
{
id: 1,
nombre: "Carlos",
apellido: "López",
habitacion: "204",
diagnostico: "Neumonía",
estado: "Estable",
temperatura: 36.5,
frecuenciaCardiaca: 72,
presionArterial: "120/80",
},
{
id: 2,
nombre: "Ana",
apellido: "Rojas",
habitacion: "205",
diagnostico: "Post operatorio",
estado: "Estable",
temperatura: 36.8,
frecuenciaCardiaca: 82,
presionArterial: "118/76",
},
{
id: 3,
nombre: "Pedro",
apellido: "Gómez",
habitacion: "206",
diagnostico: "Traumatismo",
estado: "Requiere atención",
temperatura: 39.4,
frecuenciaCardiaca: 96,
presionArterial: "130/85",
},
]);

const buscador = ref("");

const pacientesFiltrados = computed(() => {
const texto = buscador.value.toLowerCase().trim();

if (!texto) {
return pacientes.value;
}

return pacientes.value.filter((paciente) => {
return (
    `${paciente.nombre} ${paciente.apellido}`
    .toLowerCase()
    .includes(texto) ||
    paciente.habitacion.includes(texto) ||
    paciente.diagnostico.toLowerCase().includes(texto)
);
});
});
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
    <span class="section-label">ATENCIÓN Y ENFERMERÍA</span>

    <h1>Pacientes internados</h1>

    <p>
        Pacientes actualmente internados y bajo seguimiento de enfermería.
    </p>
    </div>

    <div class="patient-count">
    <strong>{{ pacientes.length }}</strong>
    <span>pacientes</span>
    </div>

</header>

<section class="toolbar">
    <div class="search-box">
    <span>⌕</span>

    <input
        v-model="buscador"
        type="text"
        placeholder="Buscar paciente, habitación o diagnóstico..."
    />
    </div>
</section>

<section class="patients-table">
    <div class="table-header">
    <span>Paciente</span>
    <span>Habitación</span>
    <span>Diagnóstico</span>
    <span>Signos vitales</span>
    <span>Estado</span>
    </div>

    <article
    v-for="paciente in pacientesFiltrados"
    :key="paciente.id"
    class="patient-row"
    >
    <div class="patient-name">
        <div class="avatar">
        {{ paciente.nombre.charAt(0) }}
        </div>

        <div>
        <strong>
            {{ paciente.nombre }} {{ paciente.apellido }}
        </strong>

        <span>Paciente internado</span>
        </div>
    </div>

    <div class="room">
        <strong>{{ paciente.habitacion }}</strong>
    </div>

    <div class="diagnosis">
        {{ paciente.diagnostico }}
    </div>

    <div class="vitals">
        <span>♥ {{ paciente.frecuenciaCardiaca }} bpm</span>

        <span
        :class="{ danger: paciente.temperatura > 39 }"
        >
        ° {{ paciente.temperatura }} °C
        </span>

        <span>+ {{ paciente.presionArterial }}</span>
    </div>

    <div>
        <span
        class="status"
        :class="{
            warning: paciente.estado !== 'Estable',
        }"
        >
        {{ paciente.estado }}
        </span>
    </div>
    </article>

    <div
    v-if="pacientesFiltrados.length === 0"
    class="empty"
    >
    No se encontraron pacientes.
    </div>
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
padding: 32px 42px;
background: #f7f9fb;
min-height: calc(100vh - 70px);
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
font-size: 11px;
font-weight: 700;
letter-spacing: 1.4px;
}

h1 {
margin: 7px 0;
font-size: 28px;
color: #163247;
}

.page-header p {
margin: 0;
color: #718496;
}

.patient-count {
display: flex;
flex-direction: column;
align-items: center;
padding: 14px 24px;
background: white;
border: 1px solid #e5ebf1;
border-radius: 10px;
}

.patient-count strong {
font-size: 24px;
color: #087fc4;
}

.patient-count span {
color: #718496;
font-size: 12px;
}

.toolbar {
margin-bottom: 18px;
}

.search-box {
display: flex;
align-items: center;
gap: 10px;
max-width: 480px;
padding: 11px 14px;
background: white;
border: 1px solid #dfe7ed;
border-radius: 8px;
}

.search-box span {
color: #7890a2;
font-size: 20px;
}

.search-box input {
width: 100%;
border: none;
outline: none;
font-size: 13px;
color: #263d4e;
}

.patients-table {
overflow: hidden;
background: white;
border: 1px solid #e5ebf1;
border-radius: 12px;
}

.table-header,
.patient-row {
display: grid;
grid-template-columns: 2fr 0.8fr 1.5fr 2fr 1.2fr;
align-items: center;
gap: 20px;
padding: 16px 20px;
}

.table-header {
background: #f7f9fb;
color: #708395;
font-size: 10px;
font-weight: 700;
text-transform: uppercase;
}

.patient-row {
border-top: 1px solid #edf1f4;
color: #455b6d;
font-size: 13px;
}

.patient-name {
display: flex;
align-items: center;
gap: 12px;
}

.avatar {
width: 38px;
height: 38px;
display: flex;
justify-content: center;
align-items: center;
border-radius: 50%;
background: #e7f5fd;
color: #087fc4;
font-weight: 700;
}

.patient-name strong {
display: block;
color: #20394b;
}

.patient-name span {
display: block;
margin-top: 3px;
color: #8999a7;
font-size: 11px;
}

.room strong {
color: #20394b;
}

.vitals {
display: flex;
flex-direction: column;
gap: 5px;
font-size: 11px;
}

.danger {
color: #d83b3b !important;
font-weight: 700;
}

.status {
display: inline-block;
padding: 6px 9px;
border-radius: 6px;
background: #e8f7ef;
color: #238452;
font-size: 11px;
font-weight: 600;
}

.status.warning {
background: #fff0f0;
color: #d83b3b;
}

.empty {
padding: 40px;
text-align: center;
color: #80909e;
}

@media (max-width: 900px) {
.page {
padding: 24px;
}

.table-header {
display: none;
}

.patient-row {
grid-template-columns: 1fr;
gap: 12px;
}

.page-header {
align-items: flex-start;
gap: 20px;
}
}
</style>