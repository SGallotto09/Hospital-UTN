
<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import EnfermeriaNav from "../components/EnfermeriaNav.vue";
import { rolActual } from "../../../../router/autenticacion";

interface PacienteDashboard {
    id: number;
    nombre: string;
    apellido: string;
    habitacion: number;
    piso: number;
    presion_arterial: string | null;
    frecuencia_cardiaca: number | null;
    temperatura: number | null;
    fecha_hora: string | null;
}

const API_URL = "/api/dashboard";

const pacientes = ref<PacienteDashboard[]>([]);
const mensaje = ref("");
const cargando = ref(false);
const guardando = ref(false);

const paciente_seleccionado = ref<PacienteDashboard | null>(null);
const mostrar_modal_control = ref(false);

const nuevo_control = ref({
    paciente_id: "",
    presion_arterial: "",
    frecuencia_cardiaca: "",
    temperatura: ""
});

const cantidad_alertas = computed(() =>
    pacientes.value.filter(tiene_alerta).length
);

function tiene_alerta(paciente: PacienteDashboard): boolean {
    return paciente.temperatura !== null && paciente.temperatura > 39;
}

function hora_control(fecha: string | null): string {
    if (!fecha) return "Sin controles";

    const fecha_control = new Date(fecha);

    if (Number.isNaN(fecha_control.getTime())) {
        return "Fecha no disponible";
    }

    return fecha_control.toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}

async function cargar_pacientes() {
    cargando.value = true;
    mensaje.value = "";

    try {
        const respuesta = await fetch(API_URL, {
            credentials: "include"
        });

        if (!respuesta.ok) {
            throw new Error("No se pudieron cargar los datos del panel");
        }

        pacientes.value = await respuesta.json() as PacienteDashboard[];

    } catch (error) {
        mensaje.value = error instanceof Error
            ? error.message
            : "Error al cargar el panel de enfermería";
    } finally {
        cargando.value = false;
    }
}

function abrir_modal_control(paciente?: PacienteDashboard) {
    nuevo_control.value = {
        paciente_id: paciente ? String(paciente.id) : "",
        presion_arterial: "",
        frecuencia_cardiaca: "",
        temperatura: ""
    };

    mensaje.value = "";
    mostrar_modal_control.value = true;
}

function cerrar_modal_control() {
    mostrar_modal_control.value = false;
}

async function registrar_control() {
    mensaje.value = "";

    const paciente_id = Number(nuevo_control.value.paciente_id);
    const frecuencia_cardiaca = Number(nuevo_control.value.frecuencia_cardiaca);
    const temperatura = Number(nuevo_control.value.temperatura);
    const presion_arterial = nuevo_control.value.presion_arterial.trim();

    if (
        !paciente_id ||
        !presion_arterial ||
        !nuevo_control.value.frecuencia_cardiaca ||
        !nuevo_control.value.temperatura
    ) {
        mensaje.value = "Completá todos los campos obligatorios.";
        return;
    }

    if (
        !Number.isInteger(paciente_id) ||
        !Number.isFinite(frecuencia_cardiaca) ||
        !Number.isFinite(temperatura) ||
        frecuencia_cardiaca <= 0 ||
        temperatura <= 0
    ) {
        mensaje.value = "Ingresá valores válidos para los signos vitales.";
        return;
    }

    guardando.value = true;

    try {
        const respuesta = await fetch("/api/signos-vitales", {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id_paciente: paciente_id,
                presion_arterial,
                frecuencia_cardiaca,
                temperatura
            })
        });

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(
                resultado.mensaje || "No se pudo registrar el control"
            );
        }

        cerrar_modal_control();
        await cargar_pacientes();

        mensaje.value = resultado.alerta
            ? resultado.mensaje || "Temperatura superior a 39 °C. Requiere atención médica."
            : "Control registrado correctamente.";

    } catch (error) {
        mensaje.value = error instanceof Error
            ? error.message
            : "Error al registrar el control";
    } finally {
        guardando.value = false;
    }
}

function ver_paciente(paciente: PacienteDashboard) {
    paciente_seleccionado.value = paciente;
}

function cerrar_paciente() {
    paciente_seleccionado.value = null;
}

function registrar_signos_del_paciente() {
    if (!paciente_seleccionado.value) return;

    const paciente = paciente_seleccionado.value;

    cerrar_paciente();
    abrir_modal_control(paciente);
}

onMounted(cargar_pacientes);
</script>


<template>
    <EnfermeriaNav />

    <div class="enfermeria">
        <header class="topbar">
            <div>
                <span class="breadcrumb">ATENCIÓN Y ENFERMERÍA</span>
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
            </div>
        </header>

        <main class="content">
            <section class="summary-grid">
                <article class="summary-card">
                    <div class="summary-icon patients">♙</div>
                    <div>
                        <span>Pacientes internados</span>
                        <strong>{{ pacientes.length }}</strong>
                    </div>
                </article>

                <article class="summary-card">
                    <div class="summary-icon alerts">!</div>
                    <div>
                        <span>Alertas activas</span>
                        <strong>{{ cantidad_alertas }}</strong>
                    </div>
                </article>
            </section>

            <section class="section-header">
                <div>
                    <span class="section-label">MONITOREO</span>
                    <h2>Pacientes internados</h2>
                    <p>Estado actual de los pacientes a cargo.</p>
                </div>

                <button
                    v-if="rolActual === 'Enfermero'"
                    class="primary-button"
                    @click="abrir_modal_control()"
                >
                    + Registrar control
                </button>
            </section>

            <section
                v-if="cantidad_alertas > 0"
                class="alert-banner"
            >
                <div class="alert-icon">!</div>

                <div class="alert-content">
                    <strong>Hay pacientes que requieren atención</strong>
                    <p>
                        Se detectaron temperaturas superiores a 39 °C.
                        Revisá los signos vitales registrados.
                    </p>
                </div>

                <RouterLink to="/enfermeria/alertas" class="alert-button">
                    Revisá los pacientes señalados
                </RouterLink>
            </section>

            <div
                v-if="mensaje"
                class="alert-banner"
                role="alert"
            >
                <div class="alert-content">
                    <strong>{{ mensaje }}</strong>
                </div>
            </div>

            <div v-if="cargando" class="empty-state">
                Cargando pacientes...
            </div>

            <div
                v-else-if="pacientes.length === 0"
                class="empty-state"
            >
                No hay pacientes internados para mostrar.
            </div>

            <section v-else class="patients-grid">
                <article
                    v-for="paciente in pacientes"
                    :key="paciente.id"
                    class="patient-card"
                    :class="{
                        'patient-card-alert': tiene_alerta(paciente)
                    }"
                >
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
                                    Piso {{ paciente.piso }}
                                </span>
                            </div>
                        </div>

                        <div class="room">
                            <small>HABITACIÓN</small>
                            <strong>{{ paciente.habitacion }}</strong>
                        </div>
                    </div>

                    <div
                        v-if="tiene_alerta(paciente)"
                        class="patient-alert"
                    >
                        <div class="patient-alert-icon">!</div>

                        <div>
                            <strong>Temperatura elevada</strong>
                            <span>Requiere revisión inmediata</span>
                        </div>
                    </div>

                    <div class="vitals">
                        <div class="vital">
                            <div class="vital-icon heart">♥</div>

                            <div>
                                <span>Frecuencia cardíaca</span>
                                <strong>
                                    {{ paciente.frecuencia_cardiaca ?? "Sin registro" }}
                                    <small v-if="paciente.frecuencia_cardiaca !== null">
                                        bpm
                                    </small>
                                </strong>
                            </div>
                        </div>

                        <div class="vital">
                            <div class="vital-icon temperature">°</div>

                            <div>
                                <span>Temperatura</span>
                                <strong
                                    :class="{
                                        danger: tiene_alerta(paciente)
                                    }"
                                >
                                    {{ paciente.temperatura ?? "Sin registro" }}
                                    <small v-if="paciente.temperatura !== null">
                                        °C
                                    </small>
                                </strong>
                            </div>
                        </div>

                        <div class="vital">
                            <div class="vital-icon pressure">+</div>

                            <div>
                                <span>Presión arterial</span>
                                <strong>
                                    {{ paciente.presion_arterial ?? "Sin registro" }}
                                </strong>
                            </div>
                        </div>
                    </div>

                    <div class="patient-footer">
                        <span class="last-control">
                            ● Último control:
                            {{ hora_control(paciente.fecha_hora) }}
                        </span>

                        <button
                            class="view-button"
                            @click="ver_paciente(paciente)"
                        >
                            Ver paciente
                            <span>→</span>
                        </button>
                    </div>
                </article>
            </section>
        </main>

        <div
            v-if="paciente_seleccionado"
            class="modal-overlay"
            @click.self="cerrar_paciente"
        >
            <div class="modal">
                <button
                    class="close-button"
                    @click="cerrar_paciente"
                    type="button"
                >
                    ×
                </button>

                <div class="modal-header">
                    <div class="modal-avatar">
                        {{ paciente_seleccionado.nombre.charAt(0) }}
                    </div>

                    <div>
                        <span class="modal-label">PACIENTE</span>

                        <h2>
                            {{ paciente_seleccionado.nombre }}
                            {{ paciente_seleccionado.apellido }}
                        </h2>

                        <p>
                            Habitación {{ paciente_seleccionado.habitacion }}
                            · Piso {{ paciente_seleccionado.piso }}
                        </p>
                    </div>
                </div>

                <div class="modal-section">
                    <h3>Signos vitales</h3>

                    <div class="modal-vitals">
                        <div>
                            <span>Frecuencia cardíaca</span>
                            <strong>
                                {{ paciente_seleccionado.frecuencia_cardiaca ?? "Sin registro" }}
                                <small v-if="paciente_seleccionado.frecuencia_cardiaca !== null">
                                    bpm
                                </small>
                            </strong>
                        </div>

                        <div>
                            <span>Temperatura</span>
                            <strong
                                :class="{
                                    danger: tiene_alerta(paciente_seleccionado)
                                }"
                            >
                                {{ paciente_seleccionado.temperatura ?? "Sin registro" }}
                                <small v-if="paciente_seleccionado.temperatura !== null">
                                    °C
                                </small>
                            </strong>
                        </div>

                        <div>
                            <span>Presión arterial</span>
                            <strong>
                                {{ paciente_seleccionado.presion_arterial ?? "Sin registro" }}
                            </strong>
                        </div>
                    </div>
                </div>

                <div class="modal-actions">
                    <button
                        class="secondary-button"
                        @click="cerrar_paciente"
                    >
                        Cerrar
                    </button>

                    <button
                        v-if="rolActual === 'Enfermero'"
                        class="primary-button"
                        @click="registrar_signos_del_paciente"
                    >
                        Registrar signos vitales
                    </button>
                </div>
            </div>
        </div>

        <div
            v-if="mostrar_modal_control"
            class="modal-overlay"
            @click.self="cerrar_modal_control"
        >
            <div class="modal modal-control">
                <button
                    class="close-button"
                    @click="cerrar_modal_control"
                    type="button"
                >
                    ×
                </button>

                <div class="control-modal-header">
                    <span class="modal-label">ENFERMERÍA</span>
                    <h2>Registrar control</h2>
                    <p>Ingresá los signos vitales del paciente.</p>
                </div>

                <form @submit.prevent="registrar_control">
                    <div class="control-form-section">
                        <label for="paciente">Paciente internado</label>

                        <select
                            id="paciente"
                            v-model="nuevo_control.paciente_id"
                            required
                        >
                            <option value="" disabled>
                                Seleccionar paciente
                            </option>

                            <option
                                v-for="paciente in pacientes"
                                :key="paciente.id"
                                :value="String(paciente.id)"
                            >
                                {{ paciente.nombre }}
                                {{ paciente.apellido }}
                                - Habitación {{ paciente.habitacion }}
                            </option>
                        </select>
                    </div>

                    <div class="control-form-section">
                        <h3>Signos vitales</h3>

                        <div class="control-form-grid">
                            <div class="form-field">
                                <label for="presion">
                                    Presión arterial
                                </label>

                                <input
                                    id="presion"
                                    v-model="nuevo_control.presion_arterial"
                                    type="text"
                                    placeholder="120/80"
                                    required
                                />

                                <small>mmHg</small>
                            </div>

                            <div class="form-field">
                                <label for="frecuencia">
                                    Frecuencia cardíaca
                                </label>

                                <input
                                    id="frecuencia"
                                    v-model="nuevo_control.frecuencia_cardiaca"
                                    type="number"
                                    min="1"
                                    placeholder="72"
                                    required
                                />

                                <small>Latidos por minuto</small>
                            </div>

                            <div class="form-field">
                                <label for="temperatura">
                                    Temperatura
                                </label>

                                <input
                                    id="temperatura"
                                    v-model="nuevo_control.temperatura"
                                    type="number"
                                    step="0.1"
                                    min="25"
                                    max="45"
                                    placeholder="36.5"
                                    required
                                />

                                <small>°C</small>
                            </div>
                        </div>
                    </div>

                    <div class="control-form-footer">
                        <button
                            type="button"
                            class="secondary-button"
                            @click="cerrar_modal_control"
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            class="primary-button"
                            :disabled="guardando"
                        >
                            {{ guardando ? "Guardando..." : "Guardar control" }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>

<style scoped>
.enfermeria {
    min-height: 100vh;
    background: #f5f8fc;
    color: #102a43;
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

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

.content {
    width: 100%;
    max-width: 1500px;
    margin: 0 auto;
    padding: 32px 42px;
}

.summary-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
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
    box-shadow: 0 3px 12px rgba(21, 52, 80, 0.03);
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
    box-shadow: 0 5px 12px rgba(16, 137, 212, 0.2);
}

.primary-button:hover {
    background: #0878bd;
}

.primary-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

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
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-left: auto;
    padding: 8px 13px;
    border: 1px solid #e9b7b7;
    border-radius: 7px;
    background: #ffffff;
    color: #c23939;
    font-size: 10px;
    text-decoration: none;
}

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
    box-shadow: 0 3px 12px rgba(21, 52, 80, 0.035);
}

.patient-card-alert {
    border-color: #f0b6b6;
    box-shadow: 0 3px 15px rgba(211, 62, 62, 0.08);
}

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

.empty-state {
    padding: 30px;
    text-align: center;
    color: #8195a9;
    background: #ffffff;
    border: 1px solid #e3eaf2;
    border-radius: 12px;
    font-size: 12px;
}

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
    max-height: 90vh;
    overflow-y: auto;
    padding: 30px;
    background: #ffffff;
    border-radius: 14px;
    box-shadow: 0 20px 60px rgba(8, 36, 61, 0.2);
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

.control-modal-header {
    padding-bottom: 20px;
}

.control-modal-header h2 {
    margin: 5px 0;
    color: #123450;
    font-size: 20px;
}

.control-modal-header p {
    margin: 0;
    color: #8295a8;
    font-size: 11px;
}

.control-form-section {
    margin-bottom: 20px;
}

.control-form-section > label,
.control-form-section h3 {
    display: block;
    margin: 0 0 10px;
    color: #123450;
    font-size: 12px;
    font-weight: 600;
}

.control-form-section select,
.control-form-section input {
    box-sizing: border-box;
    width: 100%;
    padding: 11px 12px;
    border: 1px solid #d7e1ea;
    border-radius: 7px;
    background: #ffffff;
    color: #123450;
    font-size: 12px;
}

.control-form-section select:focus,
.control-form-section input:focus {
    outline: none;
    border-color: #1089d4;
}

.control-form-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 15px;
}

.form-field {
    display: flex;
    flex-direction: column;
    gap: 7px;
}

.form-field label {
    color: #526b80;
    font-size: 10px;
    font-weight: 600;
}

.form-field small {
    color: #8295a8;
    font-size: 9px;
}

.control-form-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding-top: 18px;
    border-top: 1px solid #e8eef4;
}

@media (max-width: 1100px) {
    .patients-grid {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 800px) {
    .topbar {
        padding: 20px;
    }

    .content {
        padding: 24px 20px;
    }

    .topbar h1 {
        font-size: 22px;
    }

    .summary-grid {
        grid-template-columns: repeat(2, 1fr);
    }

    .section-header {
        align-items: flex-start;
        flex-direction: column;
        gap: 15px;
    }
}

@media (max-width: 560px) {
    .summary-grid {
        grid-template-columns: 1fr;
    }

    .vitals {
        grid-template-columns: 1fr;
    }

    .modal-vitals {
        grid-template-columns: 1fr;
    }

    .control-form-grid {
        grid-template-columns: 1fr;
    }

    .modal {
        padding: 22px;
    }

    .patient-footer {
        align-items: flex-start;
        flex-direction: column;
        gap: 12px;
    }
}
</style>
