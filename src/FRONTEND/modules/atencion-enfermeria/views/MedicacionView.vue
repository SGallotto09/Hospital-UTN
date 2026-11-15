<script setup lang="ts">
import { ref } from "vue";

interface Medicacion {
id: number;
paciente: string;
habitacion: string;
medicamento: string;
dosis: string;
horario: string;
estado: "Pendiente" | "Administrada";
}

const medicaciones = ref<Medicacion[]>([
{
id: 1,
paciente: "Ana Rojas",
habitacion: "205",
medicamento: "Ibuprofeno",
dosis: "400 mg",
horario: "14:00",
estado: "Pendiente",
},
{
id: 2,
paciente: "Carlos López",
habitacion: "204",
medicamento: "Amoxicilina",
dosis: "500 mg",
horario: "14:00",
estado: "Pendiente",
},
{
id: 3,
paciente: "Pedro Gómez",
habitacion: "206",
medicamento: "Paracetamol",
dosis: "500 mg",
horario: "13:30",
estado: "Administrada",
},
]);

function administrarMedicacion(medicacion: Medicacion) {
medicacion.estado = "Administrada";
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
    <span class="section-label">TRATAMIENTO</span>

    <h1>Administración de medicación</h1>

    <p>
        Consultá y confirmá las medicaciones prescritas para los pacientes.
    </p>
    </div>

    <div class="pending">
    <strong>
        {{
        medicaciones.filter(
            (medicacion) => medicacion.estado === "Pendiente"
        ).length
        }}
    </strong>

    <span>pendientes</span>
    </div>
</header>

<section class="medication-list">
    <article
    v-for="medicacion in medicaciones"
    :key="medicacion.id"
    class="medication-card"
    :class="{
        completed: medicacion.estado === 'Administrada'
    }"
    >
    <div class="patient">
        <div class="avatar">
        {{ medicacion.paciente.charAt(0) }}
        </div>

        <div>
        <strong>{{ medicacion.paciente }}</strong>

        <span>
            Habitación {{ medicacion.habitacion }}
        </span>
        </div>
    </div>

    <div class="medication-info">
        <span class="label">MEDICACIÓN</span>

        <strong>
        {{ medicacion.medicamento }}
        </strong>

        <span>
        {{ medicacion.dosis }}
        </span>
    </div>

    <div class="schedule">
        <span class="label">HORARIO</span>

        <strong>{{ medicacion.horario }}</strong>
    </div>

    <div class="status">
        <span
        :class="{
            done: medicacion.estado === 'Administrada',
            pending: medicacion.estado === 'Pendiente'
        }"
        >
        {{
            medicacion.estado === "Administrada"
            ? "✓ Administrada"
            : "Pendiente"
        }}
        </span>
    </div>

    <button
        v-if="medicacion.estado === 'Pendiente'"
        class="admin-button"
        @click="administrarMedicacion(medicacion)"
    >
        Administrar
    </button>

    <span
        v-else
        class="completed-text"
    >
        Registrada
    </span>
    </article>
</section>

<section class="info-box">
    <strong>Registro de administración</strong>

    <p>
    Al confirmar una medicación, la acción quedará asociada al
    usuario de enfermería y posteriormente permitirá descontar
    automáticamente el medicamento del inventario del piso.
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

.section-label,
.label {
color: #087fc4;
font-size: 10px;
font-weight: 700;
letter-spacing: 1.2px;
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

.pending {
display: flex;
flex-direction: column;
align-items: center;
padding: 13px 22px;
border: 1px solid #e5ebf1;
border-radius: 10px;
background: white;
}

.pending strong {
color: #d38a17;
font-size: 23px;
}

.pending span {
color: #718496;
font-size: 11px;
}

.medication-list {
display: flex;
flex-direction: column;
gap: 12px;
}

.medication-card {
display: grid;
grid-template-columns: 1.5fr 1.3fr 0.8fr 1fr auto;
align-items: center;
gap: 20px;
padding: 20px;
background: white;
border: 1px solid #e5ebf1;
border-radius: 11px;
}

.medication-card.completed {
opacity: 0.7;
}

.patient {
display: flex;
align-items: center;
gap: 12px;
}

.avatar {
width: 40px;
height: 40px;
display: flex;
align-items: center;
justify-content: center;
border-radius: 50%;
background: #e7f5fd;
color: #087fc4;
font-weight: 700;
}

.patient strong {
display: block;
color: #20394b;
}

.patient span {
display: block;
margin-top: 4px;
color: #8495a3;
font-size: 11px;
}

.medication-info strong {
display: block;
margin: 5px 0;
color: #263f51;
}

.medication-info > span:last-child {
color: #718496;
font-size: 12px;
}

.schedule strong {
display: block;
margin-top: 6px;
color: #263f51;
}

.status span {
display: inline-block;
padding: 6px 9px;
border-radius: 6px;
font-size: 11px;
font-weight: 600;
}

.pending {
background: #fff5df;
color: #ad7114;
}

.status .done {
background: #e8f7ef;
color: #238452;
}

.status .pending {
background: #fff5df;
color: #ad7114;
}

.admin-button {
padding: 9px 13px;
border: none;
border-radius: 7px;
background: #087fc4;
color: white;
font-size: 11px;
font-weight: 600;
cursor: pointer;
}

.admin-button:hover {
background: #066da8;
}

.completed-text {
color: #238452;
font-size: 11px;
font-weight: 600;
}

.info-box {
margin-top: 22px;
padding: 16px;
border-radius: 9px;
background: #f1f7fb;
}

.info-box strong {
color: #087fc4;
font-size: 12px;
}

.info-box p {
margin: 5px 0 0;
color: #718496;
font-size: 11px;
line-height: 1.5;
}

@media (max-width: 1000px) {
.page {
padding: 24px;
}

.medication-card {
grid-template-columns: 1fr;
}
}
</style>