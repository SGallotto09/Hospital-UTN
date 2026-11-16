
<script setup lang="ts">
import { computed, reactive, ref } from "vue";

type EstadoListaEspera = "EN_ESPERA" | "ASIGNADO" | "RETIRADO";

interface Paciente {
    id: number;
    nombre: string;
    apellido: string;
    dni: string;
}

interface Medico {
    id: number;
    nombre: string;
    especialidad: string;
}

interface PacienteEnEspera {
    id: number;
    idPaciente: number;
    idMedico: number;
    fechaSolicitada: string;
    fechaHoraIngreso: number;
    estado: EstadoListaEspera;
}

function obtenerFechaLocal(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
}

const fechaHoy = obtenerFechaLocal(new Date());

const pacientes = ref<Paciente[]>([
    { id: 1, nombre: "Carlos", apellido: "López", dni: "35678901" },
    { id: 2, nombre: "Lucía", apellido: "Fernández", dni: "42156890" },
    { id: 3, nombre: "Mariana", apellido: "Gómez", dni: "39876543" },
    { id: 4, nombre: "Martín", apellido: "Rodríguez", dni: "33214567" }
]);

const medicos = ref<Medico[]>([
    { id: 1, nombre: "Dr. Silva", especialidad: "Cardiología" },
    { id: 2, nombre: "Dra. Torres", especialidad: "Pediatría" },
    { id: 3, nombre: "Dr. Pérez", especialidad: "Clínica médica" }
]);

const listaEspera = ref<PacienteEnEspera[]>([
    {
        id: 1,
        idPaciente: 1,
        idMedico: 1,
        fechaSolicitada: fechaHoy,
        fechaHoraIngreso: Date.now() - 3600000,
        estado: "EN_ESPERA"
    },
    {
        id: 2,
        idPaciente: 2,
        idMedico: 1,
        fechaSolicitada: fechaHoy,
        fechaHoraIngreso: Date.now() - 1800000,
        estado: "EN_ESPERA"
    },
    {
        id: 3,
        idPaciente: 3,
        idMedico: 2,
        fechaSolicitada: fechaHoy,
        fechaHoraIngreso: Date.now() - 900000,
        estado: "EN_ESPERA"
    },
    {
        id: 4,
        idPaciente: 4,
        idMedico: 3,
        fechaSolicitada: fechaHoy,
        fechaHoraIngreso: Date.now(),
        estado: "EN_ESPERA"
    }
]);

const mostrarFormulario = ref(false);
const mensaje = ref("");
const error = ref("");

const nuevoRegistro = reactive({
    idPaciente: 0,
    idMedico: 0,
    fechaSolicitada: fechaHoy
});

// Solo mostramos los pacientes que continúan esperando.
const pacientesEnEspera = computed(() =>
    listaEspera.value
        .filter((registro) => registro.estado === "EN_ESPERA")
        .sort((a, b) => a.fechaHoraIngreso - b.fechaHoraIngreso)
);

function obtenerPaciente(id: number): Paciente | undefined {
    return pacientes.value.find((paciente) => paciente.id === id);
}

function obtenerMedico(id: number): Medico | undefined {
    return medicos.value.find((medico) => medico.id === id);
}

function formatearFecha(fecha: string): string {
    const partes = fecha.split("-");
    const anio = partes[0] ?? "";
    const mes = partes[1] ?? "";
    const dia = partes[2] ?? "";

    return `${dia}/${mes}/${anio}`;
}

function abrirFormulario() {
    error.value = "";
    mensaje.value = "";

    nuevoRegistro.idPaciente = pacientes.value[0]?.id ?? 0;
    nuevoRegistro.idMedico = medicos.value[0]?.id ?? 0;
    nuevoRegistro.fechaSolicitada = fechaHoy;

    mostrarFormulario.value = true;
}

function agregarPaciente() {
    error.value = "";
    mensaje.value = "";

    const pacienteExiste = pacientes.value.some(
        (paciente) => paciente.id === nuevoRegistro.idPaciente
    );

    const medicoExiste = medicos.value.some(
        (medico) => medico.id === nuevoRegistro.idMedico
    );

    if (!pacienteExiste || !medicoExiste) {
        error.value = "Seleccioná un paciente y un médico válidos.";
        return;
    }

    if (!nuevoRegistro.fechaSolicitada) {
        error.value = "Seleccioná la fecha solicitada.";
        return;
    }

    if (nuevoRegistro.fechaSolicitada < fechaHoy) {
        error.value = "La fecha solicitada no puede ser anterior a hoy.";
        return;
    }

    const yaExiste = listaEspera.value.some(
        (registro) =>
            registro.idPaciente === nuevoRegistro.idPaciente &&
            registro.idMedico === nuevoRegistro.idMedico &&
            registro.fechaSolicitada === nuevoRegistro.fechaSolicitada &&
            registro.estado === "EN_ESPERA"
    );

    if (yaExiste) {
        error.value = "Este paciente ya está en la lista de espera para ese médico y fecha.";
        return;
    }

    listaEspera.value.push({
        id: Math.max(0, ...listaEspera.value.map((registro) => registro.id)) + 1,
        idPaciente: nuevoRegistro.idPaciente,
        idMedico: nuevoRegistro.idMedico,
        fechaSolicitada: nuevoRegistro.fechaSolicitada,
        fechaHoraIngreso: Date.now(),
        estado: "EN_ESPERA"
    });

    mostrarFormulario.value = false;
    mensaje.value = "El paciente fue agregado a la lista de espera.";
}

function cancelarInscripcion(id: number) {
    const registro = listaEspera.value.find((item) => item.id === id);

    if (!registro || registro.estado !== "EN_ESPERA") return;

    const paciente = obtenerPaciente(registro.idPaciente);

    const confirmar = window.confirm(
        `¿Querés retirar a ${paciente?.nombre ?? "este paciente"} ${paciente?.apellido ?? ""} de la lista de espera?`
    );

    if (!confirmar) return;

    registro.estado = "RETIRADO";
    mensaje.value = "El paciente fue retirado de la lista de espera.";
}
</script>

<template>
    <section class="lista-espera-view">
        <header class="page-header">
            <div>
                <span class="eyebrow">ADMISIONES</span>
                <h1>Lista de espera</h1>
                <p>Pacientes que esperan un turno con un profesional médico.</p>
            </div>

            <button class="btn-primary" type="button" @click="abrirFormulario">
                <span>＋</span>
                Agregar paciente
            </button>
        </header>

        <div v-if="mensaje" class="feedback success">
            {{ mensaje }}
            <button type="button" @click="mensaje = ''">×</button>
        </div>

        <section class="content-card">
            <div class="section-heading">
                <div>
                    <h2>Pacientes en espera</h2>
                    <p>Listado de pacientes que aceptaron esperar por una cancelación.</p>
                </div>

                <span class="result-count">
                    {{ pacientesEnEspera.length }} pacientes
                </span>
            </div>

            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Paciente</th>
                            <th>DNI</th>
                            <th>Médico</th>
                            <th>Especialidad</th>
                            <th>Fecha solicitada</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>

                    <tbody>
                        <tr
                            v-for="registro in pacientesEnEspera"
                            :key="registro.id"
                        >
                            <td>
                                <div class="patient-cell">
                                    <div class="avatar">
                                        {{ obtenerPaciente(registro.idPaciente)?.nombre.charAt(0) }}
                                        {{ obtenerPaciente(registro.idPaciente)?.apellido.charAt(0) }}
                                    </div>

                                    <strong>
                                        {{ obtenerPaciente(registro.idPaciente)?.apellido }},
                                        {{ obtenerPaciente(registro.idPaciente)?.nombre }}
                                    </strong>
                                </div>
                            </td>

                            <td>
                                {{ obtenerPaciente(registro.idPaciente)?.dni }}
                            </td>

                            <td>
                                <strong class="doctor-name">
                                    {{ obtenerMedico(registro.idMedico)?.nombre }}
                                </strong>
                            </td>

                            <td>
                                {{ obtenerMedico(registro.idMedico)?.especialidad }}
                            </td>

                            <td>
                                {{ formatearFecha(registro.fechaSolicitada) }}
                            </td>

                            <td>
                                <button
                                    type="button"
                                    class="cancel-button"
                                    @click="cancelarInscripcion(registro.id)"
                                >
                                    Cancelar
                                </button>
                            </td>
                        </tr>

                        <tr v-if="pacientesEnEspera.length === 0">
                            <td colspan="6" class="empty-state">
                                <strong>No hay pacientes en lista de espera.</strong>
                                <p>Podés agregar un paciente utilizando el botón superior.</p>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>

        <div
            v-if="mostrarFormulario"
            class="modal-overlay"
            @click.self="mostrarFormulario = false"
        >
            <section class="modal">
                <header class="modal-header">
                    <div>
                        <span class="eyebrow">ADMISIONES</span>
                        <h2>Agregar a lista de espera</h2>
                        <p>Completá los datos del paciente y del profesional.</p>
                    </div>

                    <button
                        type="button"
                        class="close-button"
                        aria-label="Cerrar"
                        @click="mostrarFormulario = false"
                    >
                        ×
                    </button>
                </header>

                <form class="waitlist-form" @submit.prevent="agregarPaciente">
                    <label>
                        Paciente
                        <select v-model.number="nuevoRegistro.idPaciente" required>
                            <option
                                v-for="paciente in pacientes"
                                :key="paciente.id"
                                :value="paciente.id"
                            >
                                {{ paciente.apellido }}, {{ paciente.nombre }} — DNI {{ paciente.dni }}
                            </option>
                        </select>
                    </label>

                    <label>
                        Médico
                        <select v-model.number="nuevoRegistro.idMedico" required>
                            <option
                                v-for="medico in medicos"
                                :key="medico.id"
                                :value="medico.id"
                            >
                                {{ medico.nombre }} — {{ medico.especialidad }}
                            </option>
                        </select>
                    </label>

                    <label>
                        Fecha solicitada
                        <input
                            v-model="nuevoRegistro.fechaSolicitada"
                            type="date"
                            :min="fechaHoy"
                            required
                        />
                    </label>

                    <p v-if="error" class="feedback error">{{ error }}</p>

                    <footer class="modal-actions">
                        <button
                            type="button"
                            class="btn-secondary"
                            @click="mostrarFormulario = false"
                        >
                            Cancelar
                        </button>

                        <button type="submit" class="btn-primary">
                            Agregar a la lista
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    </section>
</template>

<style scoped>
.lista-espera-view {
    min-height: 100%;
    padding: 30px 34px;
    background: #f7f9fc;
    color: #263445;
}

button,
input,
select {
    font: inherit;
}

button {
    cursor: pointer;
}

.page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
}

.eyebrow {
    color: #087fc4;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.2px;
}

.page-header h1 {
    margin: 7px 0;
    font-size: 28px;
}

.page-header p,
.section-heading p,
.modal-header p {
    margin: 0;
    color: #8491a1;
    font-size: 14px;
}

.btn-primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 11px 17px;
    border: none;
    border-radius: 8px;
    background: #087fc4;
    color: white;
    font-size: 13px;
    font-weight: 600;
}

.btn-primary:hover {
    background: #066da9;
}

.btn-primary span {
    font-size: 18px;
}

.feedback {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 18px;
    padding: 12px 15px;
    border-radius: 8px;
    font-size: 13px;
}

.feedback.success {
    background: #e9f7f0;
    color: #18764f;
}

.feedback.success button {
    border: none;
    background: transparent;
    color: inherit;
    font-size: 19px;
}

.feedback.error {
    background: #fff0ee;
    color: #b42318;
}

.content-card {
    margin-top: 28px;
    padding: 24px;
    border: 1px solid #e9eef4;
    border-radius: 12px;
    background: white;
}

.section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
    margin-bottom: 22px;
}

.section-heading h2 {
    margin: 0 0 6px;
    font-size: 18px;
}

.result-count {
    padding: 7px 11px;
    border-radius: 20px;
    background: #eaf5fc;
    color: #087fc4;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
}

.table-wrapper {
    overflow-x: auto;
}

table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
}

th {
    padding: 13px 12px;
    background: #f8fafc;
    color: #8491a1;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    white-space: nowrap;
}

td {
    padding: 15px 12px;
    border-bottom: 1px solid #edf1f5;
    color: #536174;
    font-size: 12px;
    white-space: nowrap;
}

tbody tr:last-child td {
    border-bottom: none;
}

.patient-cell {
    display: flex;
    align-items: center;
    gap: 10px;
}

.patient-cell strong,
.doctor-name {
    color: #344255;
    font-size: 12px;
}

.avatar {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    border-radius: 50%;
    background: #e8f4fc;
    color: #087fc4;
    font-size: 10px;
    font-weight: 700;
}

.cancel-button {
    padding: 7px 11px;
    border: none;
    border-radius: 6px;
    background: #fdeeee;
    color: #b74747;
    font-size: 11px;
    font-weight: 600;
}

.cancel-button:hover {
    background: #fbdcdb;
}

.empty-state {
    padding: 45px 15px;
    text-align: center;
    white-space: normal;
}

.empty-state strong {
    display: block;
    margin-bottom: 7px;
    color: #536174;
    font-size: 13px;
}

.empty-state p {
    margin: 0;
    color: #8491a1;
    font-size: 12px;
}

.modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: grid;
    place-items: center;
    padding: 20px;
    background: rgb(20 32 46 / 45%);
}

.modal {
    width: min(500px, 100%);
    max-height: 90vh;
    overflow-y: auto;
    padding: 27px;
    border-radius: 14px;
    background: white;
    box-shadow: 0 15px 50px rgb(0 0 0 / 15%);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 15px;
    margin-bottom: 25px;
}

.modal-header h2 {
    margin: 7px 0;
    font-size: 21px;
}

.close-button {
    border: none;
    background: transparent;
    color: #8491a1;
    font-size: 26px;
}

.waitlist-form {
    display: flex;
    flex-direction: column;
    gap: 17px;
}

.waitlist-form label {
    display: flex;
    flex-direction: column;
    gap: 7px;
    color: #526174;
    font-size: 12px;
    font-weight: 600;
}

.waitlist-form input,
.waitlist-form select {
    width: 100%;
    box-sizing: border-box;
    min-height: 42px;
    padding: 9px 11px;
    border: 1px solid #e1e7ef;
    border-radius: 8px;
    outline-color: #087fc4;
    background: white;
    color: #344255;
    font-size: 13px;
}

.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 8px;
}

.btn-secondary {
    padding: 11px 16px;
    border: 1px solid #dce3eb;
    border-radius: 8px;
    background: white;
    color: #526174;
    font-size: 13px;
    font-weight: 600;
}

@media (max-width: 650px) {
    .lista-espera-view {
        padding: 20px 15px;
    }

    .page-header {
        align-items: flex-start;
        flex-direction: column;
    }

    .content-card {
        padding: 15px;
    }

    .modal {
        padding: 20px;
    }
}
</style>
