<script setup lang="ts">
import { ref } from "vue";

const pacienteSeleccionado = ref("Carlos López");

const presionArterial = ref("");
const frecuenciaCardiaca = ref("");
const temperatura = ref("");

const guardado = ref(false);

function registrarControl() {
guardado.value = true;

setTimeout(() => {
guardado.value = false;
}, 3000);
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

    <h1>Registro de signos vitales</h1>

    <p>
        Registrar los controles del paciente y asociarlos a su historia clínica.
    </p>
    </div>
</header>

<section class="content-grid">
    <div class="form-card">
    <div class="card-header">
        <div>
        <span class="card-label">NUEVO CONTROL</span>
        <h2>Signos vitales</h2>
        </div>

        <span class="time">
        {{ new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        }) }}
        </span>
    </div>

    <div class="form-group">
        <label>Paciente</label>

        <select v-model="pacienteSeleccionado">
        <option>Carlos López</option>
        <option>Ana Rojas</option>
        <option>Pedro Gómez</option>
        </select>
    </div>

    <div class="vital-fields">
        <div class="form-group">
        <label>Presión arterial</label>

        <div class="input-unit">
            <input
            v-model="presionArterial"
            type="text"
            placeholder="120/80"
            />

            <span>mmHg</span>
        </div>
        </div>

        <div class="form-group">
        <label>Frecuencia cardíaca</label>

        <div class="input-unit">
            <input
            v-model="frecuenciaCardiaca"
            type="number"
            placeholder="72"
            />

            <span>bpm</span>
        </div>
        </div>

        <div class="form-group">
        <label>Temperatura</label>

        <div class="input-unit">
            <input
            v-model="temperatura"
            type="number"
            step="0.1"
            placeholder="36.5"
            />

            <span>°C</span>
        </div>
        </div>
    </div>

    <div class="info">
        <strong>Registro automático</strong>

        <p>
        Al guardar, el control quedará asociado al paciente y
        se generará la nota de enfermería correspondiente.
        </p>
    </div>

    <div
        v-if="guardado"
        class="success"
    >
        ✓ Control registrado correctamente.
    </div>

    <div class="actions">
        <button
        class="primary-button"
        @click="registrarControl"
        >
        Guardar control
        </button>
    </div>
    </div>

    <aside class="reference-card">
    <span class="card-label">REFERENCIA</span>

    <h2>Valores de control</h2>

    <div class="reference-item">
        <span>Temperatura</span>
        <strong>36 °C – 37.5 °C</strong>
    </div>

    <div class="reference-item">
        <span>Frecuencia cardíaca</span>
        <strong>60 – 100 bpm</strong>
    </div>

    <div class="reference-item">
        <span>Presión arterial</span>
        <strong>120/80 mmHg</strong>
    </div>

    <div class="alert-reference">
        <strong>⚠ Temperatura mayor a 39 °C</strong>

        <p>
        El registro deberá generar una alerta de alta prioridad
        para el médico de guardia.
        </p>
    </div>
    </aside>
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
margin-bottom: 28px;
margin-top: 20px;
}

.section-label,
.card-label {
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

.content-grid {
display: grid;
grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
gap: 20px;
}

.form-card,
.reference-card {
padding: 26px;
background: white;
border: 1px solid #e5ebf1;
border-radius: 12px;
}

.card-header {
display: flex;
justify-content: space-between;
align-items: flex-start;
margin-bottom: 28px;
}

.card-header h2,
.reference-card h2 {
margin: 6px 0 0;
color: #20394b;
font-size: 20px;
}

.time {
padding: 7px 10px;
border-radius: 6px;
background: #f1f7fb;
color: #087fc4;
font-size: 11px;
}

.form-group {
margin-bottom: 20px;
}

.form-group label {
display: block;
margin-bottom: 7px;
color: #526879;
font-size: 12px;
font-weight: 600;
}

select,
input {
width: 100%;
box-sizing: border-box;
padding: 11px 12px;
border: 1px solid #dce5eb;
border-radius: 7px;
outline: none;
color: #294152;
background: white;
}

select:focus,
input:focus {
border-color: #087fc4;
}

.vital-fields {
display: grid;
grid-template-columns: repeat(3, 1fr);
gap: 14px;
}

.input-unit {
position: relative;
}

.input-unit input {
padding-right: 55px;
}

.input-unit span {
position: absolute;
right: 12px;
top: 50%;
transform: translateY(-50%);
color: #8393a0;
font-size: 11px;
}

.info {
padding: 14px;
margin-top: 8px;
border-radius: 8px;
background: #f1f7fb;
}

.info strong {
color: #087fc4;
font-size: 12px;
}

.info p {
margin: 5px 0 0;
color: #718496;
font-size: 11px;
line-height: 1.5;
}

.success {
margin-top: 16px;
padding: 12px;
border-radius: 7px;
background: #e8f7ef;
color: #238452;
font-size: 12px;
font-weight: 600;
}

.actions {
display: flex;
justify-content: flex-end;
margin-top: 22px;
}

.primary-button {
padding: 11px 18px;
border: none;
border-radius: 7px;
background: #087fc4;
color: white;
font-weight: 600;
cursor: pointer;
}

.primary-button:hover {
background: #066da8;
}

.reference-card {
height: fit-content;
}

.reference-item {
padding: 15px 0;
border-bottom: 1px solid #edf1f4;
}

.reference-item span {
display: block;
color: #7a8d9d;
font-size: 11px;
}

.reference-item strong {
display: block;
margin-top: 5px;
color: #263f51;
font-size: 13px;
}

.alert-reference {
margin-top: 20px;
padding: 14px;
border-radius: 8px;
background: #fff1f1;
}

.alert-reference strong {
color: #d83b3b;
font-size: 12px;
}

.alert-reference p {
margin: 6px 0 0;
color: #8c5c5c;
font-size: 11px;
line-height: 1.5;
}

@media (max-width: 900px) {
.page {
padding: 24px;
}

.content-grid {
grid-template-columns: 1fr;
}

.vital-fields {
grid-template-columns: 1fr;
}
}
</style>