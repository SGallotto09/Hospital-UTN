
<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";

// ==========================================
// TIPOS
// ==========================================

type EstadoListaEspera =
    | "EN_ESPERA"
    | "ASIGNADO"
    | "CANCELADO";

interface Paciente {
    id: number;
    nombre: string;
    apellido: string;
    dni: string;
}

interface PacienteEnEspera {
    id: number;
    idPaciente: number;
    idMedico: number;
    fechaSolicitada: string;
    fechaHoraIngreso: string;
    estado: EstadoListaEspera;
}

// ==========================================
// ESTADO
// ==========================================

const pacientes = ref<Paciente[]>([]);
const listaEspera = ref<PacienteEnEspera[]>([]);

const cargando = ref(false);
const guardando = ref(false);
const cancelandoId = ref<number | null>(null);

const mostrarFormulario = ref(false);
const mensaje = ref("");
const error = ref("");
const errorFormulario = ref("");

function obtenerFechaLocal(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
}

const fechaHoy = obtenerFechaLocal(new Date());

const nuevoRegistro = reactive({
    idPaciente: 0,
    idMedico: 0,
    fechaSolicitada: fechaHoy
});

// ==========================================
// NORMALIZACIÓN DE DATOS
// ==========================================

// Las entidades del backend pueden serializar propiedades
// privadas con "_" y los getters no aparecen en JSON.
// Por eso contemplamos ambas representaciones.

function obtenerPropiedad(
    objeto: Record<string, unknown>,
    ...nombres: string[]
): unknown {
    for (const nombre of nombres) {
        if (objeto[nombre] !== undefined) {
            return objeto[nombre];
        }
    }

    return undefined;
}

function normalizarPaciente(datos: unknown): Paciente {
    const objeto = datos as Record<string, unknown>;

    return {
        id: Number(obtenerPropiedad(objeto, "id")),
        nombre: String(obtenerPropiedad(objeto, "nombre", "_nombre") ?? ""),
        apellido: String(obtenerPropiedad(objeto, "apellido", "_apellido") ?? ""),
        dni: String(obtenerPropiedad(objeto, "dni", "_dni") ?? "")
    };
}

function normalizarSolicitud(datos: unknown): PacienteEnEspera {
    const objeto = datos as Record<string, unknown>;

    return {
        id: Number(obtenerPropiedad(objeto, "id")),
        idPaciente: Number(obtenerPropiedad(objeto, "idPaciente", "_idPaciente")),
        idMedico: Number(obtenerPropiedad(objeto, "idMedico", "_idMedico")),
        fechaSolicitada: String(
            obtenerPropiedad(objeto, "fechaSolicitada", "_fechaSolicitada") ?? ""
        ).slice(0, 10),
        fechaHoraIngreso: String(
            obtenerPropiedad(objeto, "fechaHoraIngreso", "_fechaHoraIngreso") ?? ""
        ),
        estado: String(
            obtenerPropiedad(objeto, "estado", "_estado") ?? "EN_ESPERA"
        ) as EstadoListaEspera
    };
}

// ==========================================
// COMUNICACIÓN CON EL BACKEND
// ==========================================

async function solicitarAPI<T>(
    url: string,
    opciones: RequestInit = {}
): Promise<T> {

    const respuesta = await fetch(url, {
        ...opciones,
        credentials: "same-origin",
        headers: {
            ...(opciones.body
                ? { "Content-Type": "application/json" }
                : {}),
            ...opciones.headers
        }
    });

    const datos = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok) {
        throw new Error(
            datos.mensaje ||
            `Error del servidor: ${respuesta.status}`
        );
    }

    return datos as T;
}

// ==========================================
// CARGAR PACIENTES
// ==========================================

async function cargarPacientes(): Promise<void> {

    const respuesta = await solicitarAPI<{
        pacientes: unknown[]
    }>("/api/admisiones/pacientes");

    if (!Array.isArray(respuesta.pacientes)) {
        throw new Error("La respuesta de pacientes no tiene el formato esperado.");
    }

    pacientes.value = respuesta.pacientes.map(normalizarPaciente);
}

// ==========================================
// CARGAR LISTA DE ESPERA
// ==========================================

async function cargarListaEspera(): Promise<void> {

    const respuesta = await solicitarAPI<{
        solicitudes: unknown[]
    }>("/api/admisiones/lista-espera?estado=EN_ESPERA");

    if (!Array.isArray(respuesta.solicitudes)) {
        throw new Error("La respuesta de la lista de espera no tiene el formato esperado.");
    }

    listaEspera.value = respuesta.solicitudes.map(normalizarSolicitud);
}

// ==========================================
// CARGAR INFORMACIÓN INICIAL
// ==========================================

async function cargarDatos(): Promise<void> {

    cargando.value = true;
    error.value = "";

    try {
        await Promise.all([
            cargarPacientes(),
            cargarListaEspera()
        ]);

    } catch (err) {

        error.value = err instanceof Error
            ? err.message
            : "No se pudieron cargar los datos.";

    } finally {

        cargando.value = false;

    }
}

onMounted(() => {
    void cargarDatos();
});

// ==========================================
// DATOS COMPUTADOS
// ==========================================

const pacientesEnEspera = computed(() =>
    [...listaEspera.value]
        .filter(registro => registro.estado === "EN_ESPERA")
        .sort(
            (a, b) =>
                new Date(a.fechaHoraIngreso).getTime() -
                new Date(b.fechaHoraIngreso).getTime()
        )
);

function obtenerPaciente(id: number): Paciente | undefined {
    return pacientes.value.find(paciente => paciente.id === id);
}

function formatearFecha(fecha: string): string {
    if (!fecha) return "-";

    const partes = fecha.split("-");

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

// ==========================================
// FORMULARIO
// ==========================================

function abrirFormulario(): void {

    errorFormulario.value = "";
    mensaje.value = "";
    error.value = "";

    nuevoRegistro.idPaciente = pacientes.value[0]?.id ?? 0;
    nuevoRegistro.idMedico = 0;
    nuevoRegistro.fechaSolicitada = fechaHoy;

    mostrarFormulario.value = true;
}

function cerrarFormulario(): void {
    mostrarFormulario.value = false;
    errorFormulario.value = "";
}

// ==========================================
// AGREGAR PACIENTE
// ==========================================

async function agregarPaciente(): Promise<void> {

    errorFormulario.value = "";
    mensaje.value = "";

    if (!nuevoRegistro.idPaciente || nuevoRegistro.idPaciente <= 0) {
        errorFormulario.value = "Seleccioná un paciente válido.";
        return;
    }

    if (!nuevoRegistro.idMedico || nuevoRegistro.idMedico <= 0) {
        errorFormulario.value = "Ingresá un ID de médico válido.";
        return;
    }

    if (!nuevoRegistro.fechaSolicitada) {
        errorFormulario.value = "Seleccioná la fecha solicitada.";
        return;
    }

    if (nuevoRegistro.fechaSolicitada < fechaHoy) {
        errorFormulario.value = "La fecha solicitada no puede ser anterior a hoy.";
        return;
    }

    const pacienteExiste = pacientes.value.some(
        paciente => paciente.id === nuevoRegistro.idPaciente
    );

    if (!pacienteExiste) {
        errorFormulario.value = "El paciente seleccionado no existe.";
        return;
    }

    guardando.value = true;

    try {

        await solicitarAPI(
            "/api/admisiones/lista-espera",
            {
                method: "POST",
                body: JSON.stringify({
                    idPaciente: nuevoRegistro.idPaciente,
                    idMedico: nuevoRegistro.idMedico,
                    fechaSolicitada: nuevoRegistro.fechaSolicitada
                })
            }
        );

        cerrarFormulario();

        mensaje.value = "El paciente fue agregado correctamente a la lista de espera.";

        await cargarListaEspera();

    } catch (err) {

        errorFormulario.value = err instanceof Error
            ? err.message
            : "No se pudo agregar al paciente.";

    } finally {

        guardando.value = false;

    }
}

// ==========================================
// CANCELAR SOLICITUD
// ==========================================

async function cancelarInscripcion(id: number): Promise<void> {

    const registro = listaEspera.value.find(
        item => item.id === id
    );

    if (!registro || registro.estado !== "EN_ESPERA") {
        return;
    }

    const paciente = obtenerPaciente(registro.idPaciente);

    const confirmar = window.confirm(
        `¿Querés retirar a ${paciente?.nombre ?? "este paciente"} ${paciente?.apellido ?? ""} de la lista de espera?`
    );

    if (!confirmar) return;

    cancelandoId.value = id;
    error.value = "";
    mensaje.value = "";

    try {

        await solicitarAPI(
            `/api/admisiones/lista-espera/${id}`,
            {
                method: "DELETE"
            }
        );

        listaEspera.value = listaEspera.value.filter(
            item => item.id !== id
        );

        mensaje.value = "El paciente fue retirado de la lista de espera.";

    } catch (err) {

        error.value = err instanceof Error
            ? err.message
            : "No se pudo cancelar la solicitud.";

    } finally {

        cancelandoId.value = null;

    }
}

</script>

<template>
    <section class="lista-espera-view">

        <!-- ENCABEZADO -->

        <header class="page-header">
            <div>
                <span class="eyebrow">ADMISIONES</span>
                <h1>Lista de espera</h1>
                <p>Pacientes que esperan un turno con un profesional médico.</p>
            </div>

            <button
                class="btn-primary"
                type="button"
                @click="abrirFormulario"
                :disabled="cargando || pacientes.length === 0"
            >
                <span>＋</span>
                Agregar paciente
            </button>
        </header>

        <!-- MENSAJES -->

        <div v-if="mensaje" class="feedback success">
            {{ mensaje }}

            <button type="button" @click="mensaje = ''">×</button>
        </div>

        <div v-if="error" class="feedback error">
            {{ error }}

            <button type="button" @click="error = ''">×</button>
        </div>

        <!-- TABLA -->

        <section class="content-card">

            <div class="section-heading">
                <div>
                    <h2>Pacientes en espera</h2>
                    <p>Listado de pacientes que esperan por una cancelación.</p>
                </div>

                <span class="result-count">
                    {{ pacientesEnEspera.length }} pacientes
                </span>
            </div>

            <div v-if="cargando" class="empty-state">
                Cargando información...
            </div>

            <div v-else class="table-wrapper">

                <table>
                    <thead>
                        <tr>
                            <th>Paciente</th>
                            <th>DNI</th>
                            <th>Médico</th>
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
                                        {{
                                            obtenerPaciente(registro.idPaciente)?.nombre.charAt(0)
                                        }}
                                        {{
                                            obtenerPaciente(registro.idPaciente)?.apellido.charAt(0)
                                        }}
                                    </div>

                                    <strong>
                                        {{
                                            obtenerPaciente(registro.idPaciente)?.apellido
                                            ?? "Paciente desconocido"
                                        }},
                                        {{
                                            obtenerPaciente(registro.idPaciente)?.nombre
                                            ?? `ID ${registro.idPaciente}`
                                        }}
                                    </strong>

                                </div>
                            </td>

                            <td>
                                {{ obtenerPaciente(registro.idPaciente)?.dni ?? "-" }}
                            </td>

                            <td>
                                <strong class="doctor-name">
                                    Médico #{{ registro.idMedico }}
                                </strong>
                            </td>

                            <td>
                                {{ formatearFecha(registro.fechaSolicitada) }}
                            </td>

                            <td>
                                <button
                                    type="button"
                                    class="cancel-button"
                                    :disabled="cancelandoId === registro.id"
                                    @click="cancelarInscripcion(registro.id)"
                                >
                                    {{
                                        cancelandoId === registro.id
                                            ? "Cancelando..."
                                            : "Cancelar"
                                    }}
                                </button>
                            </td>
                        </tr>

                        <tr v-if="pacientesEnEspera.length === 0">
                            <td colspan="5" class="empty-state">
                                <strong>
                                    No hay pacientes en lista de espera.
                                </strong>

                                <p>
                                    Podés agregar un paciente utilizando el botón superior.
                                </p>
                            </td>
                        </tr>

                    </tbody>
                </table>

            </div>

        </section>

        <!-- MODAL -->

        <div
            v-if="mostrarFormulario"
            class="modal-overlay"
            @click.self="cerrarFormulario"
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
                        @click="cerrarFormulario"
                    >
                        ×
                    </button>
                </header>

                <form
                    class="waitlist-form"
                    @submit.prevent="agregarPaciente"
                >

                    <label>
                        Paciente

                        <select
                            v-model.number="nuevoRegistro.idPaciente"
                            required
                        >
                            <option
                                v-for="paciente in pacientes"
                                :key="paciente.id"
                                :value="paciente.id"
                            >
                                {{ paciente.apellido }}, {{ paciente.nombre }}
                                — DNI {{ paciente.dni }}
                            </option>
                        </select>
                    </label>

                    <label>
                        ID del médico

                        <input
                            v-model.number="nuevoRegistro.idMedico"
                            type="number"
                            min="1"
                            step="1"
                            placeholder="Ingresá el ID del médico"
                            required
                        />

                        <small>
                            Utilizá el ID de un médico registrado en usuarios.
                        </small>
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

                    <p v-if="errorFormulario" class="feedback error">
                        {{ errorFormulario }}
                    </p>

                    <footer class="modal-actions">

                        <button
                            type="button"
                            class="btn-secondary"
                            @click="cerrarFormulario"
                            :disabled="guardando"
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            class="btn-primary"
                            :disabled="guardando || pacientes.length === 0"
                        >
                            {{
                                guardando
                                    ? "Guardando..."
                                    : "Agregar a la lista"
                            }}
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

button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
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

.feedback.success button,
.feedback.error button {
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

.cancel-button:disabled {
    background: #f5f5f5;
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

.waitlist-form small {
    color: #8491a1;
    font-size: 11px;
    font-weight: 400;
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
