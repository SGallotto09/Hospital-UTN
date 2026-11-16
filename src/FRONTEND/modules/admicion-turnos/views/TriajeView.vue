
<script setup lang="ts">
import { computed, reactive, ref } from "vue";

type NivelUrgencia = "ROJO" | "AMARILLO" | "VERDE";
type EstadoTriaje = "EN_ESPERA" | "EN_ATENCION" | "ATENDIDO";

interface Paciente {
    id: number;
    nombre: string;
    apellido: string;
    dni: string;
}

interface Triaje {
    id: number;
    idPaciente: number;
    idEnfermero: number;
    nivelUrgencia: NivelUrgencia;
    observaciones: string | null;
    fechaHoraIngreso: number;
    estado: EstadoTriaje;
}

const pacientes = ref<Paciente[]>([
    { id: 1, nombre: "Carlos", apellido: "López", dni: "35678901" },
    { id: 2, nombre: "Lucía", apellido: "Fernández", dni: "42156890" },
    { id: 3, nombre: "Mariana", apellido: "Gómez", dni: "39876543" },
    { id: 4, nombre: "Martín", apellido: "Rodríguez", dni: "33214567" }
]);

const triajes = ref<Triaje[]>([
    {
        id: 1,
        idPaciente: 1,
        idEnfermero: 5,
        nivelUrgencia: "ROJO",
        observaciones: "Dolor intenso en el pecho",
        fechaHoraIngreso: Date.now() - 3600000,
        estado: "EN_ESPERA"
    },
    {
        id: 2,
        idPaciente: 2,
        idEnfermero: 5,
        nivelUrgencia: "AMARILLO",
        observaciones: "Fiebre alta",
        fechaHoraIngreso: Date.now() - 2400000,
        estado: "EN_ESPERA"
    },
    {
        id: 3,
        idPaciente: 3,
        idEnfermero: 5,
        nivelUrgencia: "VERDE",
        observaciones: "Dolor de cabeza leve",
        fechaHoraIngreso: Date.now() - 1200000,
        estado: "EN_ESPERA"
    }
]);

const mostrarFormulario = ref(false);
const mensaje = ref("");
const error = ref("");

const nuevoTriaje = reactive({
    idPaciente: 0,
    nivelUrgencia: "VERDE" as NivelUrgencia,
    observaciones: ""
});

// Prioridad clínica y, en caso de empate, orden de ingreso.
const triajesOrdenados = computed(() => {
    const prioridad: Record<NivelUrgencia, number> = {
        ROJO: 1,
        AMARILLO: 2,
        VERDE: 3
    };

    return [...triajes.value]
        .filter((triaje) => triaje.estado !== "ATENDIDO")
        .sort((a, b) => {
            const diferencia =
                prioridad[a.nivelUrgencia] - prioridad[b.nivelUrgencia];

            return diferencia !== 0
                ? diferencia
                : a.fechaHoraIngreso - b.fechaHoraIngreso;
        });
});

function obtenerPaciente(id: number): Paciente | undefined {
    return pacientes.value.find((paciente) => paciente.id === id);
}

function formatearHora(timestamp: number): string {
    return new Intl.DateTimeFormat("es-AR", {
        hour: "2-digit",
        minute: "2-digit"
    }).format(new Date(timestamp));
}

function obtenerClaseUrgencia(nivel: NivelUrgencia): string {
    const clases: Record<NivelUrgencia, string> = {
        ROJO: "urgencia-roja",
        AMARILLO: "urgencia-amarilla",
        VERDE: "urgencia-verde"
    };

    return clases[nivel];
}

function obtenerNombreEstado(estado: EstadoTriaje): string {
    const nombres: Record<EstadoTriaje, string> = {
        EN_ESPERA: "En espera",
        EN_ATENCION: "En atención",
        ATENDIDO: "Atendido"
    };

    return nombres[estado];
}

function abrirFormulario() {
    error.value = "";
    mensaje.value = "";

    nuevoTriaje.idPaciente = pacientes.value[0]?.id ?? 0;
    nuevoTriaje.nivelUrgencia = "VERDE";
    nuevoTriaje.observaciones = "";

    mostrarFormulario.value = true;
}

function registrarTriaje() {
    error.value = "";
    mensaje.value = "";

    const pacienteExiste = pacientes.value.some(
        (paciente) => paciente.id === nuevoTriaje.idPaciente
    );

    if (!pacienteExiste) {
        error.value = "Seleccioná un paciente válido.";
        return;
    }

    if (
        nuevoTriaje.observaciones.trim().length > 45
    ) {
        error.value = "Las observaciones no pueden superar los 45 caracteres.";
        return;
    }

    const yaTieneTriajeActivo = triajes.value.some(
        (triaje) =>
            triaje.idPaciente === nuevoTriaje.idPaciente &&
            triaje.estado !== "ATENDIDO"
    );

    if (yaTieneTriajeActivo) {
        error.value = "Este paciente ya tiene un triaje pendiente.";
        return;
    }

    const nuevoRegistro: Triaje = {
        id: Math.max(0, ...triajes.value.map((item) => item.id)) + 1,
        idPaciente: nuevoTriaje.idPaciente,
        idEnfermero: 5,
        nivelUrgencia: nuevoTriaje.nivelUrgencia,
        observaciones: nuevoTriaje.observaciones.trim() || null,
        fechaHoraIngreso: Date.now(),
        estado: "EN_ESPERA"
    };

    triajes.value.push(nuevoRegistro);

    if (nuevoRegistro.nivelUrgencia === "ROJO") {
        mensaje.value =
            "¡Urgencia ROJA! Se debe alertar inmediatamente a los médicos de guardia.";
    } else {
        mensaje.value = "El triaje fue registrado correctamente.";
    }

    mostrarFormulario.value = false;
}

function iniciarAtencion(id: number) {
    const triaje = triajes.value.find((item) => item.id === id);

    if (!triaje || triaje.estado !== "EN_ESPERA") return;

    triaje.estado = "EN_ATENCION";
    mensaje.value = "Se inició la atención del paciente.";
}

function finalizarAtencion(id: number) {
    const triaje = triajes.value.find((item) => item.id === id);

    if (!triaje || triaje.estado !== "EN_ATENCION") return;

    triaje.estado = "ATENDIDO";
    mensaje.value = "La atención del paciente fue finalizada.";
}
</script>

<template>
    <section class="triaje-view">
        <header class="page-header">
            <div>
                <span class="eyebrow">ADMISIONES</span>
                <h1>Triaje de pacientes</h1>
                <p>Evaluación inicial y priorización de pacientes sin turno.</p>
            </div>

            <button class="btn-primary" type="button" @click="abrirFormulario">
                <span>＋</span>
                Registrar triaje
            </button>
        </header>

        <div v-if="mensaje" class="feedback">
            <span>{{ mensaje }}</span>
            <button type="button" @click="mensaje = ''">×</button>
        </div>

        <div class="urgency-legend">
            <span><i class="dot rojo"></i> ROJO — Riesgo vital</span>
            <span><i class="dot amarillo"></i> AMARILLO — Urgencia intermedia</span>
            <span><i class="dot verde"></i> VERDE — Menor urgencia</span>
        </div>

        <section class="content-card">
            <div class="section-heading">
                <div>
                    <h2>Pacientes en espera de atención</h2>
                    <p>Ordenados según el nivel de urgencia y el momento de ingreso.</p>
                </div>

                <span class="result-count">
                    {{ triajesOrdenados.length }} pacientes
                </span>
            </div>

            <div class="patients-list">
                <article
                    v-for="triaje in triajesOrdenados"
                    :key="triaje.id"
                    class="patient-row"
                    :class="obtenerClaseUrgencia(triaje.nivelUrgencia)"
                >
                    <div class="urgency-indicator"></div>

                    <div class="patient-information">
                        <div class="patient-name">
                            <strong>
                                {{ obtenerPaciente(triaje.idPaciente)?.apellido }},
                                {{ obtenerPaciente(triaje.idPaciente)?.nombre }}
                            </strong>

                            <span
                                class="urgency-badge"
                                :class="obtenerClaseUrgencia(triaje.nivelUrgencia)"
                            >
                                {{ triaje.nivelUrgencia }}
                            </span>
                        </div>

                        <span class="patient-details">
                            DNI {{ obtenerPaciente(triaje.idPaciente)?.dni }}
                            · Ingreso {{ formatearHora(triaje.fechaHoraIngreso) }}
                        </span>

                        <span v-if="triaje.observaciones" class="observations">
                            {{ triaje.observaciones }}
                        </span>
                    </div>

                    <div class="patient-actions">
                        <span
                            class="state-badge"
                            :class="triaje.estado === 'EN_ATENCION' ? 'state-active' : 'state-waiting'"
                        >
                            {{ obtenerNombreEstado(triaje.estado) }}
                        </span>

                        <button
                            v-if="triaje.estado === 'EN_ESPERA'"
                            type="button"
                            class="action-button start-button"
                            @click="iniciarAtencion(triaje.id)"
                        >
                            Iniciar atención
                        </button>

                        <button
                            v-if="triaje.estado === 'EN_ATENCION'"
                            type="button"
                            class="action-button finish-button"
                            @click="finalizarAtencion(triaje.id)"
                        >
                            Finalizar atención
                        </button>
                    </div>
                </article>

                <div v-if="triajesOrdenados.length === 0" class="empty-state">
                    <strong>No hay pacientes pendientes de atención.</strong>
                    <p>Los nuevos registros de triaje aparecerán en esta lista.</p>
                </div>
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
                        <h2>Registrar nuevo triaje</h2>
                        <p>Ingresá los datos de la evaluación inicial.</p>
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

                <form class="triaje-form" @submit.prevent="registrarTriaje">
                    <label>
                        Paciente
                        <select v-model.number="nuevoTriaje.idPaciente" required>
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
                        Nivel de urgencia
                        <select v-model="nuevoTriaje.nivelUrgencia" required>
                            <option value="ROJO">ROJO — Riesgo vital</option>
                            <option value="AMARILLO">AMARILLO — Urgencia intermedia</option>
                            <option value="VERDE">VERDE — Menor urgencia</option>
                        </select>
                    </label>

                    <label>
                        Observaciones
                        <textarea
                            v-model="nuevoTriaje.observaciones"
                            maxlength="45"
                            rows="3"
                            placeholder="Descripción breve de la situación..."
                        ></textarea>
                        <small>{{ nuevoTriaje.observaciones.length }}/45 caracteres</small>
                    </label>

                    <div v-if="nuevoTriaje.nivelUrgencia === 'ROJO'" class="red-alert">
                        Atención: los casos ROJOS requieren atención inmediata y una alerta a los médicos de guardia.
                    </div>

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
                            Registrar triaje
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    </section>
</template>

<style scoped>
.triaje-view {
    min-height: 100%;
    padding: 30px 34px;
    background: #f7f9fc;
    color: #263445;
}

button,
input,
select,
textarea {
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
    gap: 12px;
    margin-top: 18px;
    padding: 12px 15px;
    border-radius: 8px;
    background: #e9f7f0;
    color: #18764f;
    font-size: 13px;
}

.feedback button {
    border: none;
    background: transparent;
    color: inherit;
    font-size: 19px;
}

.feedback.error {
    background: #fff0ee;
    color: #b42318;
}

.urgency-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 22px;
    margin: 25px 0 18px;
    padding: 15px 18px;
    border: 1px solid #e9eef4;
    border-radius: 10px;
    background: white;
}

.urgency-legend span {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #536174;
    font-size: 12px;
}

.dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
}

.dot.rojo {
    background: #dc4c4c;
}

.dot.amarillo {
    background: #e5ab37;
}

.dot.verde {
    background: #34a477;
}

.content-card {
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

.patients-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.patient-row {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 17px;
    border: 1px solid #e9eef4;
    border-radius: 10px;
    background: #fff;
}

.urgency-indicator {
    width: 5px;
    min-height: 55px;
    align-self: stretch;
    border-radius: 5px;
    background: #34a477;
}

.patient-row.urgencia-roja .urgency-indicator {
    background: #dc4c4c;
}

.patient-row.urgencia-amarilla .urgency-indicator {
    background: #e5ab37;
}

.patient-information {
    display: flex;
    flex: 1;
    min-width: 0;
    flex-direction: column;
    gap: 6px;
}

.patient-name {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
}

.patient-name strong {
    color: #344255;
    font-size: 13px;
}

.patient-details,
.observations {
    color: #8491a1;
    font-size: 11px;
}

.observations {
    color: #536174;
}

.urgency-badge {
    padding: 5px 9px;
    border-radius: 20px;
    font-size: 10px;
    font-weight: 700;
}

.urgency-badge.urgencia-roja {
    background: #fdeeee;
    color: #bd3636;
}

.urgency-badge.urgencia-amarilla {
    background: #fff5df;
    color: #9a711f;
}

.urgency-badge.urgencia-verde {
    background: #e9f7f0;
    color: #21835f;
}

.patient-actions {
    display: flex;
    align-items: center;
    gap: 12px;
}

.state-badge {
    padding: 6px 9px;
    border-radius: 20px;
    font-size: 10px;
    font-weight: 600;
    white-space: nowrap;
}

.state-waiting {
    background: #f1f4f7;
    color: #667487;
}

.state-active {
    background: #eaf5fc;
    color: #1975ad;
}

.action-button {
    padding: 8px 12px;
    border: none;
    border-radius: 7px;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
}

.start-button {
    background: #eaf5fc;
    color: #087fc4;
}

.finish-button {
    background: #e9f7f0;
    color: #21835f;
}

.empty-state {
    padding: 40px 15px;
    text-align: center;
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

.triaje-form {
    display: flex;
    flex-direction: column;
    gap: 17px;
}

.triaje-form label {
    display: flex;
    flex-direction: column;
    gap: 7px;
    color: #526174;
    font-size: 12px;
    font-weight: 600;
}

.triaje-form input,
.triaje-form select,
.triaje-form textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 10px 11px;
    border: 1px solid #e1e7ef;
    border-radius: 8px;
    outline-color: #087fc4;
    background: white;
    color: #344255;
    font-size: 13px;
}

.triaje-form textarea {
    resize: vertical;
}

.triaje-form label small {
    align-self: flex-end;
    color: #8491a1;
    font-size: 10px;
    font-weight: 400;
}

.red-alert {
    padding: 12px;
    border-radius: 8px;
    background: #fdeeee;
    color: #bd3636;
    font-size: 12px;
    line-height: 1.5;
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

@media (max-width: 750px) {
    .patient-row {
        align-items: flex-start;
        flex-wrap: wrap;
    }

    .patient-actions {
        width: 100%;
        justify-content: flex-end;
        flex-wrap: wrap;
    }
}

@media (max-width: 600px) {
    .triaje-view {
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
