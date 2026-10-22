<script setup lang="ts">
import { ref, computed } from "vue";
import EnfermeriaNav from "../components/EnfermeriaNav.vue";

interface Paciente {
id: number;
nombre: string;
apellido: string;
habitacion: string;
diagnostico: string;
frecuenciaCardiaca: number;
temperatura: number;
presionArterial: string;
alerta: boolean;
ultimoControl: string;
}

const pacientes = ref<Paciente[]>([
{
id: 1,
nombre: "Carlos",
apellido: "López",
habitacion: "204",
diagnostico: "Neumonía",
frecuenciaCardiaca: 72,
temperatura: 36.5,
presionArterial: "120/80",
alerta: false,
ultimoControl: "14:20",
},
{
id: 2,
nombre: "Ana",
apellido: "Rojas",
habitacion: "205",
diagnostico: "Post operatorio",
frecuenciaCardiaca: 82,
temperatura: 36.8,
presionArterial: "118/76",
alerta: false,
ultimoControl: "14:20",
},
{
id: 3,
nombre: "Pedro",
apellido: "Gómez",
habitacion: "206",
diagnostico: "Traumatismo",
frecuenciaCardiaca: 96,
temperatura: 39.4,
presionArterial: "130/85",
alerta: true,
ultimoControl: "14:15",
},
]);

const pacienteSeleccionado = ref<Paciente | null>(null);

const cantidadAlertas = computed(() => {
return pacientes.value.filter((paciente) => paciente.alerta).length;
});

function verPaciente(paciente: Paciente) {
pacienteSeleccionado.value = paciente;
}

function cerrarPaciente() {
pacienteSeleccionado.value = null;
}
</script>

<template>
    <EnfermeriaNav/>
<div class="enfermeria">
<!-- HEADER DEL MÓDULO -->
<header class="topbar">
    <div>
    <span class="breadcrumb">
        ATENCIÓN Y ENFERMERÍA
    </span>

    <h1>Panel de enfermería</h1>

    <p>
        Gestión del cuidado diario y monitoreo de pacientes internados.
    </p>
    </div>

    <div class="topbar-right">
    <div class="status">
        <span class="status-dot"></span>
        Turno activo
    </div>

    <div class="user">
        <div class="avatar">
        MT
        </div>

        <div>
        <strong>Martín Torres</strong>
        <span>Enfermero</span>
        </div>
    </div>
    </div>
</header>

<!-- CONTENIDO -->
<main class="content">

    <!-- RESUMEN -->
    <section class="summary-grid">

    <article class="summary-card">
        <div class="summary-icon patients">
        ♙
        </div>

        <div>
        <span>Pacientes internados</span>
        <strong>{{ pacientes.length }}</strong>
        </div>
    </article>

    <article class="summary-card">
        <div class="summary-icon controls">
        ♥
        </div>

        <div>
        <span>Controles pendientes</span>
        <strong>4</strong>
        </div>
    </article>

    <article class="summary-card">
        <div class="summary-icon medication">
        ▣
        </div>

        <div>
        <span>Medicaciones pendientes</span>
        <strong>2</strong>
        </div>
    </article>

    <article class="summary-card">
        <div class="summary-icon alerts">
        !
        </div>

        <div>
        <span>Alertas activas</span>
        <strong>{{ cantidadAlertas }}</strong>
        </div>
    </article>

    </section>

    <!-- CABECERA PACIENTES -->
    <section class="section-header">

    <div>
        <span class="section-label">
        MONITOREO
        </span>

        <h2>Pacientes internados</h2>

        <p>
        Estado actual de los pacientes a cargo.
        </p>
    </div>

    <button class="primary-button">
        + Registrar control
    </button>

    </section>

    <!-- ALERTA GENERAL -->
    <section
    v-if="cantidadAlertas > 0"
    class="alert-banner"
    >
    <div class="alert-icon">
        !
    </div>

    <div class="alert-content">
        <strong>
        Hay pacientes que requieren atención
        </strong>

        <p>
        Se detectaron parámetros fuera de rango.
        Revisá los signos vitales registrados.
        </p>
    </div>

    <button class="alert-button">
        Ver alertas
    </button>
    </section>

    <!-- PACIENTES -->
    <section class="patients-grid">

    <article
        v-for="paciente in pacientes"
        :key="paciente.id"
        class="patient-card"
        :class="{ 'patient-card-alert': paciente.alerta }"
    >

        <!-- INFORMACIÓN DEL PACIENTE -->
        <div class="patient-header">

        <div class="patient-info">

            <div class="patient-avatar">
            {{ paciente.nombre.charAt(0) }}
            </div>

            <div>
            <h3>
                {{ paciente.nombre }}
                {{ paciente.apellido }}
            </h3>

            <span>
                {{ paciente.diagnostico }}
            </span>
            </div>

        </div>

        <div class="room">
            <small>HABITACIÓN</small>

            <strong>
            {{ paciente.habitacion }}
            </strong>
        </div>

        </div>

        <!-- ALERTA DEL PACIENTE -->
        <div
        v-if="paciente.alerta"
        class="patient-alert"
        >
        <div class="patient-alert-icon">
            !
        </div>

        <div>
            <strong>
            Parámetros fuera de rango
            </strong>

            <span>
            Requiere revisión inmediata
            </span>
        </div>
        </div>

        <!-- SIGNOS VITALES -->
        <div class="vitals">

        <!-- FRECUENCIA CARDÍACA -->
        <div class="vital">

            <div class="vital-icon heart">
            ♥
            </div>

            <div>
            <span>Frecuencia cardíaca</span>

            <strong>
                {{ paciente.frecuenciaCardiaca }}
                <small>bpm</small>
            </strong>
            </div>

        </div>

        <!-- TEMPERATURA -->
        <div class="vital">

            <div class="vital-icon temperature">
            °
            </div>

            <div>
            <span>Temperatura</span>

            <strong
                :class="{
                danger: paciente.temperatura > 39,
                }"
            >
                {{ paciente.temperatura }}
                <small>°C</small>
            </strong>
            </div>

        </div>

        <!-- PRESIÓN -->
        <div class="vital">

            <div class="vital-icon pressure">
            +
            </div>

            <div>
            <span>Presión arterial</span>

            <strong>
                {{ paciente.presionArterial }}
            </strong>
            </div>

        </div>

        </div>

        <!-- FOOTER PACIENTE -->
        <div class="patient-footer">

        <span class="last-control">
            ● Último control:
            {{ paciente.ultimoControl }}
        </span>

        <button
            class="view-button"
            @click="verPaciente(paciente)"
        >
            Ver paciente
            <span>→</span>
        </button>

        </div>

    </article>

    </section>

</main>

<!-- MODAL DEL PACIENTE -->
<div
    v-if="pacienteSeleccionado"
    class="modal-overlay"
    @click.self="cerrarPaciente"
>

    <div class="modal">

    <button
        class="close-button"
        @click="cerrarPaciente"
    >
        ×
    </button>

    <div class="modal-header">

        <div class="modal-avatar">
        {{ pacienteSeleccionado.nombre.charAt(0) }}
        </div>

        <div>
        <span class="modal-label">
            PACIENTE
        </span>

        <h2>
            {{ pacienteSeleccionado.nombre }}
            {{ pacienteSeleccionado.apellido }}
        </h2>

        <p>
            Habitación
            {{ pacienteSeleccionado.habitacion }}
            ·
            {{ pacienteSeleccionado.diagnostico }}
        </p>
        </div>

    </div>

    <div class="modal-section">

        <h3>
        Signos vitales
        </h3>

        <div class="modal-vitals">

        <div>
            <span>Frecuencia cardíaca</span>

            <strong>
            {{ pacienteSeleccionado.frecuenciaCardiaca }}
            bpm
            </strong>
        </div>

        <div>
            <span>Temperatura</span>

            <strong
            :class="{
                danger:
                pacienteSeleccionado.temperatura > 39,
            }"
            >
            {{ pacienteSeleccionado.temperatura }} °C
            </strong>
        </div>

        <div>
            <span>Presión arterial</span>

            <strong>
            {{ pacienteSeleccionado.presionArterial }}
            </strong>
        </div>

        </div>

    </div>

    <div class="modal-actions">

        <button
        class="secondary-button"
        @click="cerrarPaciente"
        >
        Cerrar
        </button>

        <button class="primary-button">
        Registrar signos vitales
        </button>

    </div>

    </div>

</div>

</div>
</template>

<style scoped>
.enfermeria {
min-height: 100vh;
background: #f5f8fc;
color: #102a43;
font-family:
Inter,
-apple-system,
BlinkMacSystemFont,
"Segoe UI",
sans-serif;
}

/* =========================
HEADER
========================= */

.topbar {
min-height: 120px;
padding: 28px 42px;
background: #ffffff;
border-bottom: 1px solid #e3eaf2;

display: flex;
align-items: center;
justify-content: space-between;
}

.breadcrumb {
color: #087fc4;
font-size: 9px;
font-weight: 800;
letter-spacing: 1.5px;
}

.topbar h1 {
margin: 7px 0 4px;
color: #0c2b48;
font-size: 26px;
}

.topbar p {
margin: 0;
color: #7890a7;
font-size: 12px;
}

.topbar-right {
display: flex;
align-items: center;
gap: 28px;
}

.status {
color: #698198;
font-size: 11px;
}

.status-dot {
display: inline-block;
width: 7px;
height: 7px;
margin-right: 6px;
border-radius: 50%;
background: #20bf6b;
}

.user {
display: flex;
align-items: center;
gap: 10px;
}

.avatar {
width: 38px;
height: 38px;
border-radius: 50%;

display: flex;
align-items: center;
justify-content: center;

background: #e0f2ff;
color: #087ec7;

font-size: 12px;
font-weight: 700;
}

.user strong {
display: block;
color: #173b59;
font-size: 12px;
}

.user span {
display: block;
margin-top: 2px;
color: #8297aa;
font-size: 10px;
}

/* =========================
CONTENIDO
========================= */

.content {
width: 100%;
max-width: 1500px;
margin: 0 auto;
padding: 32px 42px;
}

/* =========================
RESUMEN
========================= */

.summary-grid {
display: grid;
grid-template-columns: repeat(4, 1fr);
gap: 16px;
margin-bottom: 34px;
}

.summary-card {
display: flex;
align-items: center;
gap: 14px;

padding: 20px;

background: #ffffff;
border: 1px solid #e3eaf2;
border-radius: 12px;

box-shadow:
0 3px 12px rgba(21, 52, 80, 0.03);
}

.summary-icon {
width: 43px;
height: 43px;
border-radius: 10px;

display: flex;
align-items: center;
justify-content: center;

font-size: 18px;
font-weight: 700;
}

.summary-icon.patients {
background: #e5f5ff;
color: #0b8dd6;
}

.summary-icon.controls {
background: #e7f8f2;
color: #15a878;
}

.summary-icon.medication {
background: #fff5df;
color: #db941d;
}

.summary-icon.alerts {
background: #ffe9e9;
color: #df4141;
}

.summary-card span {
display: block;
margin-bottom: 5px;

color: #8295a8;
font-size: 10px;
}

.summary-card strong {
color: #123450;
font-size: 23px;
}

.summary-icon.alerts + div strong {
color: #d53d3d;
}

/* =========================
SECCIÓN PACIENTES
========================= */

.section-header {
display: flex;
align-items: center;
justify-content: space-between;

margin-bottom: 18px;
}

.section-label {
color: #087fc4;
font-size: 8px;
font-weight: 800;
letter-spacing: 1.2px;
}

.section-header h2 {
margin: 5px 0;

color: #123450;
font-size: 19px;
}

.section-header p {
margin: 0;

color: #8195a9;
font-size: 11px;
}

.primary-button {
border: 0;
border-radius: 8px;

padding: 11px 17px;

background: #1089d4;
color: white;

font-size: 11px;
font-weight: 600;

cursor: pointer;

box-shadow:
0 5px 12px rgba(16, 137, 212, 0.2);
}

.primary-button:hover {
background: #0878bd;
}

/* =========================
ALERTA GENERAL
========================= */

.alert-banner {
display: flex;
align-items: center;
gap: 14px;

margin-bottom: 20px;
padding: 15px 18px;

background: #fff5f5;
border: 1px solid #ffd4d4;
border-left: 4px solid #e64b4b;
border-radius: 9px;
}

.alert-icon {
width: 32px;
height: 32px;
border-radius: 50%;

display: flex;
align-items: center;
justify-content: center;

background: #ffe0e0;
color: #d93636;

font-weight: 800;
}

.alert-content strong {
display: block;

color: #a92d2d;
font-size: 12px;
}

.alert-content p {
margin: 4px 0 0;

color: #9a6c6c;
font-size: 10px;
}

.alert-button {
margin-left: auto;

padding: 8px 13px;

border: 1px solid #e9b7b7;
border-radius: 7px;

background: #ffffff;
color: #c23939;

font-size: 10px;
cursor: pointer;
}

/* =========================
PACIENTES
========================= */

.patients-grid {
display: grid;
grid-template-columns: repeat(2, 1fr);
gap: 18px;
}

.patient-card {
padding: 20px;

background: #ffffff;
border: 1px solid #e3eaf2;
border-radius: 12px;

box-shadow:
0 3px 12px rgba(21, 52, 80, 0.035);
}

.patient-card-alert {
border-color: #f0b6b6;

box-shadow:
0 3px 15px rgba(211, 62, 62, 0.08);
}

/* =========================
CABECERA PACIENTE
========================= */

.patient-header {
display: flex;
align-items: center;
justify-content: space-between;
}

.patient-info {
display: flex;
align-items: center;
gap: 12px;
}

.patient-avatar {
width: 43px;
height: 43px;
border-radius: 50%;

display: flex;
align-items: center;
justify-content: center;

background: #e6f5ff;
color: #087ec7;

font-weight: 700;
}

.patient-info h3 {
margin: 0 0 4px;

color: #153a57;
font-size: 14px;
}

.patient-info span {
color: #8295a7;
font-size: 10px;
}

.room {
text-align: right;
}

.room small {
display: block;

color: #91a2b2;
font-size: 8px;
letter-spacing: 1px;
}

.room strong {
color: #167fbe;
font-size: 15px;
}

/* =========================
ALERTA PACIENTE
========================= */

.patient-alert {
display: flex;
align-items: center;
gap: 10px;

margin-top: 18px;
padding: 10px 12px;

background: #fff3f3;
border-radius: 7px;
}

.patient-alert-icon {
width: 25px;
height: 25px;
border-radius: 50%;

display: flex;
align-items: center;
justify-content: center;

background: #ffe0e0;
color: #d63c3c;

font-weight: 800;
}

.patient-alert strong {
display: block;

color: #b23232;
font-size: 10px;
}

.patient-alert span {
display: block;
margin-top: 2px;

color: #a97b7b;
font-size: 9px;
}

/* =========================
SIGNOS VITALES
========================= */

.vitals {
display: grid;
grid-template-columns: repeat(3, 1fr);
gap: 10px;

margin: 20px 0;
}

.vital {
display: flex;
align-items: center;
gap: 9px;

padding: 11px;

background: #f7fafd;
border-radius: 8px;
}

.vital-icon {
width: 30px;
height: 30px;
border-radius: 7px;

display: flex;
align-items: center;
justify-content: center;

font-weight: 700;
}

.vital-icon.heart {
background: #eaf6ff;
color: #168fd2;
}

.vital-icon.temperature {
background: #fff4e4;
color: #df941f;
}

.vital-icon.pressure {
background: #eef0ff;
color: #6875d8;
}

.vital span {
display: block;

margin-bottom: 3px;

color: #8b9dad;
font-size: 8px;
}

.vital strong {
color: #163a56;
font-size: 12px;
}

.vital strong small {
color: #8396a8;
font-size: 8px;
}

.danger {
color: #d63838 !important;
}

/* =========================
FOOTER PACIENTE
========================= */

.patient-footer {
display: flex;
align-items: center;
justify-content: space-between;

padding-top: 14px;

border-top: 1px solid #edf1f5;
}

.last-control {
color: #8a9baa;
font-size: 9px;
}

.view-button {
border: 0;
background: transparent;

color: #0785cf;

font-size: 10px;
font-weight: 700;

cursor: pointer;
}

.view-button span {
margin-left: 5px;
font-size: 14px;
}

.view-button:hover {
color: #056da8;
}

/* =========================
MODAL
========================= */

.modal-overlay {
position: fixed;
inset: 0;

display: flex;
align-items: center;
justify-content: center;

padding: 20px;

background: rgba(8, 36, 61, 0.45);

z-index: 100;
}

.modal {
position: relative;

width: 100%;
max-width: 600px;

padding: 30px;

background: #ffffff;
border-radius: 14px;

box-shadow:
0 20px 60px rgba(8, 36, 61, 0.2);
}

.close-button {
position: absolute;
top: 18px;
right: 18px;

width: 30px;
height: 30px;

border: 0;
border-radius: 50%;

background: #f1f5f9;
color: #64748b;

font-size: 20px;

cursor: pointer;
}

.modal-header {
display: flex;
align-items: center;
gap: 14px;

padding-bottom: 22px;

border-bottom: 1px solid #e8eef4;
}

.modal-avatar {
width: 52px;
height: 52px;
border-radius: 50%;

display: flex;
align-items: center;
justify-content: center;

background: #e5f5ff;
color: #087ec7;

font-size: 18px;
font-weight: 700;
}

.modal-label {
color: #087fc4;
font-size: 8px;
font-weight: 800;
letter-spacing: 1.2px;
}

.modal-header h2 {
margin: 4px 0;

color: #123450;
font-size: 20px;
}

.modal-header p {
margin: 0;

color: #8295a8;
font-size: 10px;
}

.modal-section {
padding: 22px 0;
}

.modal-section h3 {
margin: 0 0 14px;

color: #123450;
font-size: 14px;
}

.modal-vitals {
display: grid;
grid-template-columns: repeat(3, 1fr);
gap: 10px;
}

.modal-vitals div {
padding: 14px;

background: #f7fafd;
border-radius: 8px;
}

.modal-vitals span {
display: block;
margin-bottom: 7px;

color: #8295a8;
font-size: 9px;
}

.modal-vitals strong {
color: #123450;
font-size: 14px;
}

.modal-actions {
display: flex;
justify-content: flex-end;
gap: 10px;

padding-top: 18px;

border-top: 1px solid #e8eef4;
}

.secondary-button {
padding: 10px 16px;

border: 1px solid #d7e1ea;
border-radius: 8px;

background: #ffffff;
color: #526b80;

font-size: 10px;
font-weight: 600;

cursor: pointer;
}

/* =========================
RESPONSIVE
========================= */

@media (max-width: 1100px) {
.summary-grid {
grid-template-columns: repeat(2, 1fr);
}

.patients-grid {
grid-template-columns: 1fr;
}
}

@media (max-width: 800px) {
.topbar {
padding: 20px;
}

.topbar-right {
display: none;
}

.content {
padding: 20px;
}

.summary-grid {
grid-template-columns: 1fr;
}

.section-header {
align-items: flex-start;
gap: 15px;
}

.vitals {
grid-template-columns: 1fr;
}

.modal-vitals {
grid-template-columns: 1fr;
}
}
</style>