<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

// =====================================================
// TIPOS
// =====================================================

type EstadoTurno =
    | "Programado"
    | "Confirmado"
    | "En Sala de Espera"
    | "Atendido"
    | "Cancelado";

interface Medico {
    id: number;
    nombre: string;
    apellido: string;
}

interface Paciente {
    id: number;
    nombre: string;
    apellido: string;
    dni: string;
}

interface TurnoApi {
    id: number;
    idPaciente: number;
    idMedico: number;
    idRecepcionista: number;
    fechaHoraInicio: string;
    fechaHoraFin: string;
    estado: EstadoTurno;
    costo: number;
}

interface TurnoAgenda {
    id: number;
    idPaciente: number;
    idMedico: number;
    horaInicio: string;
    horaFin: string;
    paciente: string;
    dni: string;
    estado: EstadoTurno;
}

interface IntervaloDisponible {
    inicio: string;
    fin: string;
}

interface RespuestaMedicos {
    medicos: Medico[];
}

interface RespuestaPacientes {
    pacientes: Paciente[];
}

interface RespuestaTurnos {
    turnos: TurnoApi[];
}

// =====================================================
// FECHAS Y HORARIOS
// =====================================================

function obtenerFechaLocal(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
}

function convertirHoraAMinutos(hora: string): number {
    const [horas, minutos] = hora.split(":").map(Number);

    return (horas ?? 0) * 60 + (minutos ?? 0);
}

function convertirMinutosAHora(minutos: number): string {
    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;

    return `${String(horas).padStart(2, "0")}:${String(resto).padStart(2, "0")}`;
}

function formatoFecha(fecha: string): string {
    if (!fecha) return "";

    const [anio, mes, dia] = fecha.split("-");

    return `${dia}/${mes}/${anio}`;
}

const fechaHoy = obtenerFechaLocal(new Date());

// =====================================================
// ESTADO DE LA VISTA
// =====================================================

const medicos = ref<Medico[]>([]);
const pacientes = ref<Paciente[]>([]);
const turnos = ref<TurnoAgenda[]>([]);

const cargando = ref(false);
const cargandoAgenda = ref(false);
const error = ref("");

const fechaSeleccionada = ref(fechaHoy);
const medicoSeleccionado = ref<number | null>(null);

// Evita que una respuesta antigua sobrescriba una consulta más reciente.
let solicitudAgendaActual = 0;

// =====================================================
// RESPUESTAS DE LA API
// =====================================================

function obtenerMensaje(datos: unknown): string | null {
    if (
        typeof datos === "object" &&
        datos !== null &&
        "mensaje" in datos &&
        typeof datos.mensaje === "string"
    ) {
        return datos.mensaje;
    }

    return null;
}

async function obtenerJSON<T>(respuesta: Response): Promise<T> {
    const datos: unknown = await respuesta.json().catch(() => null);

    if (!respuesta.ok) {
        throw new Error(
            obtenerMensaje(datos) ??
            `Error al consultar el servidor (${respuesta.status}).`
        );
    }

    if (datos === null) {
        throw new Error("El servidor devolvió una respuesta vacía.");
    }

    return datos as T;
}

// =====================================================
// CONVERTIR TURNO DEL BACKEND
// =====================================================

function convertirTurno(turno: TurnoApi): TurnoAgenda {
    const inicio = new Date(turno.fechaHoraInicio);
    const fin = new Date(turno.fechaHoraFin);

    if (
        Number.isNaN(inicio.getTime()) ||
        Number.isNaN(fin.getTime())
    ) {
        throw new Error(`El turno ${turno.id} tiene fechas inválidas.`);
    }

    const paciente = pacientes.value.find(
        (item) => item.id === turno.idPaciente
    );

    return {
        id: turno.id,
        idPaciente: turno.idPaciente,
        idMedico: turno.idMedico,
        horaInicio: `${String(inicio.getHours()).padStart(2, "0")}:${String(inicio.getMinutes()).padStart(2, "0")}`,
        horaFin: `${String(fin.getHours()).padStart(2, "0")}:${String(fin.getMinutes()).padStart(2, "0")}`,
        paciente: paciente
            ? `${paciente.apellido}, ${paciente.nombre}`
            : "Paciente no encontrado",
        dni: paciente?.dni ?? "—",
        estado: turno.estado
    };
}

// =====================================================
// CARGAR MÉDICOS Y PACIENTES
// =====================================================

async function cargarDatos(): Promise<void> {
    cargando.value = true;
    error.value = "";

    try {
        const [respuestaMedicos, respuestaPacientes] = await Promise.all([
            fetch("/api/admisiones/medicos", {
                method: "GET",
                credentials: "same-origin"
            }),
            fetch("/api/admisiones/pacientes", {
                method: "GET",
                credentials: "same-origin"
            })
        ]);

        const [datosMedicos, datosPacientes] = await Promise.all([
            obtenerJSON<RespuestaMedicos>(respuestaMedicos),
            obtenerJSON<RespuestaPacientes>(respuestaPacientes)
        ]);

        if (
            !Array.isArray(datosMedicos.medicos) ||
            !Array.isArray(datosPacientes.pacientes)
        ) {
            throw new Error("El servidor devolvió información inválida.");
        }

        medicos.value = [...datosMedicos.medicos].sort((a, b) =>
            a.apellido.localeCompare(b.apellido)
        );
        pacientes.value = datosPacientes.pacientes;

        medicoSeleccionado.value = medicos.value[0]?.id ?? null;

        if (medicoSeleccionado.value !== null) {
            await cargarAgenda();
        } else {
            turnos.value = [];
        }
    } catch (err) {
        error.value = err instanceof Error
            ? err.message
            : "No se pudieron cargar los datos de la agenda.";
    } finally {
        cargando.value = false;
    }
}

// =====================================================
// CARGAR AGENDA DEL MÉDICO Y FECHA SELECCIONADOS
// =====================================================

async function cargarAgenda(): Promise<void> {
    const idMedico = medicoSeleccionado.value;
    const fecha = fechaSeleccionada.value;
    const numeroSolicitud = ++solicitudAgendaActual;

    if (idMedico === null || !fecha) {
        turnos.value = [];
        cargandoAgenda.value = false;
        return;
    }

    cargandoAgenda.value = true;
    error.value = "";
    turnos.value = [];

    try {
        const parametros = new URLSearchParams({
            idMedico: String(idMedico),
            fecha
        });

        const respuesta = await fetch(
            `/api/admisiones/turnos/agenda?${parametros.toString()}`,
            {
                method: "GET",
                credentials: "same-origin"
            }
        );

        const datos = await obtenerJSON<RespuestaTurnos>(respuesta);

        if (numeroSolicitud !== solicitudAgendaActual) return;

        if (!Array.isArray(datos.turnos)) {
            throw new Error("El servidor devolvió una agenda inválida.");
        }

        turnos.value = datos.turnos
            .map(convertirTurno)
            .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
    } catch (err) {
        if (numeroSolicitud === solicitudAgendaActual) {
            turnos.value = [];
            error.value = err instanceof Error
                ? err.message
                : "No se pudo cargar la agenda médica.";
        }
    } finally {
        if (numeroSolicitud === solicitudAgendaActual) {
            cargandoAgenda.value = false;
        }
    }
}

// =====================================================
// NAVEGACIÓN ENTRE FECHAS
// =====================================================

function cambiarDia(cantidad: number): void {
    const fecha = new Date(`${fechaSeleccionada.value}T12:00:00`);
    fecha.setDate(fecha.getDate() + cantidad);
    fechaSeleccionada.value = obtenerFechaLocal(fecha);

    void cargarAgenda();
}

function seleccionarHoy(): void {
    fechaSeleccionada.value = fechaHoy;
    void cargarAgenda();
}

// =====================================================
// DATOS CALCULADOS
// =====================================================

const medicoActual = computed(() =>
    medicos.value.find((medico) => medico.id === medicoSeleccionado.value)
);

const turnosDelDia = computed(() => turnos.value);

const turnosActivos = computed(() =>
    turnosDelDia.value.filter((turno) => turno.estado !== "Cancelado")
);

const turnosConfirmados = computed(() =>
    turnosActivos.value.filter(
        (turno) =>
            turno.estado === "Confirmado" ||
            turno.estado === "En Sala de Espera"
    ).length
);

const duracionOcupada = computed(() =>
    turnosActivos.value.reduce((total, turno) => {
        const inicio = convertirHoraAMinutos(turno.horaInicio);
        const fin = convertirHoraAMinutos(turno.horaFin);

        return total + (fin - inicio);
    }, 0)
);

// =====================================================
// HORARIOS DISPONIBLES
// =====================================================

const intervalosDisponibles = computed<IntervaloDisponible[]>(() => {
    const intervalos: IntervaloDisponible[] = [];
    const inicioJornada = 8 * 60;
    const finJornada = 17 * 60;
    const duracionTurno = 30;

    for (
        let minutos = inicioJornada;
        minutos + duracionTurno <= finJornada;
        minutos += duracionTurno
    ) {
        const horaInicio = convertirMinutosAHora(minutos);
        const horaFin = convertirMinutosAHora(minutos + duracionTurno);

        const estaOcupado = turnosActivos.value.some((turno) => {
            const inicioOcupado = convertirHoraAMinutos(turno.horaInicio);
            const finOcupado = convertirHoraAMinutos(turno.horaFin);

            return (
                inicioOcupado < minutos + duracionTurno &&
                finOcupado > minutos
            );
        });

        if (estaOcupado) continue;

        const ultimoIntervalo = intervalos[intervalos.length - 1];

        if (ultimoIntervalo && ultimoIntervalo.fin === horaInicio) {
            ultimoIntervalo.fin = horaFin;
        } else {
            intervalos.push({ inicio: horaInicio, fin: horaFin });
        }
    }

    return intervalos;
});

// =====================================================
// ESTADOS Y DURACIONES
// =====================================================

function obtenerEstadoClase(estado: EstadoTurno): string {
    const clases: Record<EstadoTurno, string> = {
        Programado: "programado",
        Confirmado: "confirmado",
        "En Sala de Espera": "en-espera",
        Atendido: "atendido",
        Cancelado: "cancelado"
    };

    return clases[estado];
}

function obtenerDuracion(turno: TurnoAgenda): number {
    return (
        convertirHoraAMinutos(turno.horaFin) -
        convertirHoraAMinutos(turno.horaInicio)
    );
}

// =====================================================
// CARGA INICIAL
// =====================================================

onMounted(() => {
    void cargarDatos();
});
</script>

<template>
    <section class="agenda-view">
        <header class="page-header">
            <div>
                <span class="eyebrow">ADMISIONES</span>
                <h1>Agenda médica</h1>
                <p>Consultá los turnos y la disponibilidad de los profesionales.</p>
            </div>
        </header>

        <section class="filters-card">
            <div class="filter-group">
                <label for="medico">Profesional médico</label>
                <select
                    id="medico"
                    v-model.number="medicoSeleccionado"
                    :disabled="cargando || medicos.length === 0"
                    @change="cargarAgenda"
                >
                    <option v-if="medicos.length === 0" :value="null" disabled>
                        No hay médicos registrados
                    </option>
                    <option
                        v-for="medico in medicos"
                        :key="medico.id"
                        :value="medico.id"
                    >
                        {{ medico.apellido }}, {{ medico.nombre }}
                    </option>
                </select>
            </div>

            <div class="filter-group date-filter">
                <label for="fecha">Fecha de consulta</label>
                <div class="date-controls">
                    <button
                        type="button"
                        @click="cambiarDia(-1)"
                        aria-label="Día anterior"
                    >
                        ‹
                    </button>
                    <input
                        id="fecha"
                        v-model="fechaSeleccionada"
                        type="date"
                        @change="cargarAgenda"
                    />
                    <button
                        type="button"
                        @click="cambiarDia(1)"
                        aria-label="Día siguiente"
                    >
                        ›
                    </button>
                </div>
            </div>

            <button
                type="button"
                class="today-button"
                @click="seleccionarHoy"
            >
                Hoy
            </button>
        </section>

        <section class="doctor-heading">
            <div class="doctor-avatar">MD</div>
            <div>
                <h2 v-if="medicoActual">
                    {{ medicoActual.apellido }}, {{ medicoActual.nombre }}
                </h2>
                <h2 v-else>Sin profesionales registrados</h2>
                <p>Agenda del profesional · {{ formatoFecha(fechaSeleccionada) }}</p>
            </div>
        </section>

        <section class="summary-grid">
            <article class="summary-card">
                <div class="summary-icon blue">▦</div>
                <div>
                    <span>Turnos activos</span>
                    <strong>{{ turnosActivos.length }}</strong>
                    <small>En la fecha seleccionada</small>
                </div>
            </article>

            <article class="summary-card">
                <div class="summary-icon green">✓</div>
                <div>
                    <span>Confirmados / en espera</span>
                    <strong>{{ turnosConfirmados }}</strong>
                    <small>Pacientes confirmados o en sala</small>
                </div>
            </article>

            <article class="summary-card">
                <div class="summary-icon orange">◷</div>
                <div>
                    <span>Tiempo ocupado</span>
                    <strong>{{ duracionOcupada }} min</strong>
                    <small>Sobre el horario de referencia</small>
                </div>
            </article>
        </section>

        <div class="agenda-columns">
            <section class="schedule-section">
                <div class="section-heading">
                    <div>
                        <h2>Turnos del día</h2>
                        <p>Detalle de las consultas programadas.</p>
                    </div>
                    <span class="result-count">{{ turnosDelDia.length }} registros</span>
                </div>

                <div v-if="cargando || cargandoAgenda" class="empty-state">
                    <strong>Cargando agenda médica...</strong>
                </div>

                <div v-else-if="error" class="empty-state">
                    <strong>{{ error }}</strong>
                </div>

                <div v-else-if="turnosDelDia.length > 0" class="appointments-list">
                    <article
                        v-for="turno in turnosDelDia"
                        :key="turno.id"
                        class="appointment-row"
                        :class="{ 'appointment-cancelled': turno.estado === 'Cancelado' }"
                    >
                        <div class="appointment-time">
                            <strong>{{ turno.horaInicio }}</strong>
                            <span>{{ turno.horaFin }}</span>
                        </div>

                        <div class="appointment-details">
                            <strong>{{ turno.paciente }}</strong>
                            <span>DNI {{ turno.dni }}</span>
                        </div>

                        <div class="appointment-duration">
                            {{ obtenerDuracion(turno) }} min
                        </div>

                        <span
                            class="status-badge"
                            :class="obtenerEstadoClase(turno.estado)"
                        >
                            {{ turno.estado }}
                        </span>
                    </article>
                </div>

                <div v-else class="empty-state">
                    <div class="empty-icon">▦</div>
                    <strong>No hay turnos registrados</strong>
                    <p>Este profesional no tiene consultas programadas para esta fecha.</p>
                </div>
            </section>

            <aside class="availability-section">
                <div class="section-heading">
                    <div>
                        <h2>Horarios disponibles</h2>
                        <p>Intervalos libres de 30 minutos o más.</p>
                    </div>
                </div>

                <div v-if="cargando || cargandoAgenda" class="empty-availability">
                    Consultando disponibilidad...
                </div>

                <div
                    v-else-if="intervalosDisponibles.length > 0"
                    class="availability-list"
                >
                    <div
                        v-for="(intervalo, indice) in intervalosDisponibles"
                        :key="indice"
                        class="availability-item"
                    >
                        <span class="available-dot"></span>
                        <strong>{{ intervalo.inicio }} — {{ intervalo.fin }}</strong>
                        <span class="available-label">Disponible</span>
                    </div>
                </div>

                <div v-else class="empty-availability">
                    <strong>Sin intervalos disponibles</strong>
                    <p>No se encontraron horarios libres en la jornada de referencia.</p>
                </div>

                <div class="availability-note">
                    <strong>Horario de referencia</strong>
                    <span>08:00 a 17:00</span>
                </div>
            </aside>
        </div>

        <div class="legend">
            <span><i class="legend-dot programado"></i> Programado</span>
            <span><i class="legend-dot confirmado"></i> Confirmado</span>
            <span><i class="legend-dot en-espera"></i> En sala de espera</span>
            <span><i class="legend-dot atendido"></i> Atendido</span>
            <span><i class="legend-dot cancelado"></i> Cancelado</span>
        </div>
    </section>
</template>

<style scoped>
.agenda-view {
    min-height: 100%;
    padding: 30px 34px;
    background: #f7f9fc;
    color: #263445;
}

.page-header h1 {
    margin: 7px 0;
    font-size: 28px;
}

.page-header p,
.section-heading p {
    margin: 0;
    color: #8491a1;
    font-size: 14px;
}

.eyebrow {
    color: #087fc4;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.2px;
}

.filters-card {
    display: flex;
    align-items: flex-end;
    gap: 18px;
    margin-top: 27px;
    padding: 20px;
    border: 1px solid #e9eef4;
    border-radius: 12px;
    background: white;
}

.filter-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 250px;
}

.filter-group label {
    color: #536174;
    font-size: 12px;
    font-weight: 600;
}

.filter-group select,
.date-controls input {
    min-height: 40px;
    padding: 0 12px;
    border: 1px solid #e1e7ef;
    border-radius: 8px;
    background: white;
    color: #344255;
    font: inherit;
    font-size: 13px;
}

.filter-group select:disabled {
    cursor: not-allowed;
    background: #f7f9fc;
}

.date-controls {
    display: flex;
    gap: 6px;
}

.date-controls input {
    flex: 1;
}

.date-controls button {
    width: 38px;
    border: 1px solid #e1e7ef;
    border-radius: 8px;
    background: white;
    color: #526174;
    font-size: 22px;
    cursor: pointer;
}

.today-button {
    min-height: 40px;
    padding: 0 17px;
    border: 1px solid #cfe5f4;
    border-radius: 8px;
    background: #edf7fd;
    color: #087fc4;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
}

.doctor-heading {
    display: flex;
    align-items: center;
    gap: 13px;
    margin: 27px 0 18px;
}

.doctor-avatar {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: #e8f4fc;
    color: #087fc4;
    font-size: 13px;
    font-weight: 700;
}

.doctor-heading h2 {
    margin: 0 0 4px;
    font-size: 17px;
}

.doctor-heading p {
    margin: 0;
    color: #8491a1;
    font-size: 12px;
}

.summary-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 17px;
    margin-bottom: 22px;
}

.summary-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 19px;
    border: 1px solid #e9eef4;
    border-radius: 11px;
    background: white;
}

.summary-icon {
    display: grid;
    place-items: center;
    width: 43px;
    height: 43px;
    border-radius: 10px;
    font-size: 21px;
}

.summary-icon.blue {
    color: #087fc4;
    background: #e8f4fc;
}

.summary-icon.green {
    color: #21966a;
    background: #e8f7f0;
}

.summary-icon.orange {
    color: #d58a25;
    background: #fff4e4;
}

.summary-card span,
.summary-card small {
    display: block;
    color: #8491a1;
    font-size: 11px;
}

.summary-card strong {
    display: block;
    margin: 4px 0;
    font-size: 23px;
}

.agenda-columns {
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) minmax(280px, 1fr);
    align-items: start;
    gap: 18px;
}

.schedule-section,
.availability-section {
    min-width: 0;
    padding: 22px;
    border: 1px solid #e9eef4;
    border-radius: 12px;
    background: white;
}

.section-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    margin-bottom: 19px;
}

.section-heading h2 {
    margin: 0 0 5px;
    font-size: 17px;
}

.result-count {
    padding: 6px 10px;
    border-radius: 20px;
    background: #eaf5fc;
    color: #087fc4;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
}

.appointments-list {
    display: flex;
    flex-direction: column;
}

.appointment-row {
    display: grid;
    grid-template-columns: 60px minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
    padding: 16px 0;
    border-bottom: 1px solid #edf1f5;
}

.appointment-row:last-child {
    border-bottom: none;
}

.appointment-time strong,
.appointment-time span {
    display: block;
    font-size: 12px;
}

.appointment-time strong {
    color: #344255;
}

.appointment-time span {
    margin-top: 4px;
    color: #8491a1;
}

.appointment-details {
    min-width: 0;
}

.appointment-details strong,
.appointment-details span {
    display: block;
}

.appointment-details strong {
    overflow: hidden;
    color: #344255;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.appointment-details span {
    margin-top: 5px;
    overflow: hidden;
    color: #8491a1;
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.appointment-duration {
    color: #8491a1;
    font-size: 11px;
    white-space: nowrap;
}

.status-badge {
    grid-column: 2 / 4;
    justify-self: start;
    padding: 5px 9px;
    border-radius: 20px;
    font-size: 10px;
    font-weight: 600;
}

.programado {
    color: #936820;
    background: #fff5df;
}

.confirmado {
    color: #1975ad;
    background: #eaf5fc;
}

.en-espera {
    color: #9863bd;
    background: #f4ebfb;
}

.atendido {
    color: #21835f;
    background: #e9f7f0;
}

.cancelado {
    color: #b74747;
    background: #fdeeee;
}

.appointment-cancelled .appointment-details strong,
.appointment-cancelled .appointment-time strong {
    color: #9ba4af;
    text-decoration: line-through;
}

.availability-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.availability-item {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 11px;
    border: 1px solid #e3f1e9;
    border-radius: 8px;
    background: #f7fcf9;
}

.available-dot {
    width: 8px;
    height: 8px;
    flex-shrink: 0;
    border-radius: 50%;
    background: #26a36f;
}

.availability-item strong {
    color: #3d5d4d;
    font-size: 12px;
}

.available-label {
    margin-left: auto;
    color: #29936a;
    font-size: 10px;
}

.availability-note {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid #edf1f5;
    color: #8491a1;
    font-size: 11px;
}

.availability-note strong {
    color: #536174;
}

.empty-state,
.empty-availability {
    padding: 30px 12px;
    text-align: center;
    color: #8491a1;
}

.empty-icon {
    margin-bottom: 10px;
    font-size: 28px;
}

.empty-state strong,
.empty-availability strong {
    display: block;
    margin-bottom: 6px;
    color: #536174;
    font-size: 13px;
}

.empty-state p,
.empty-availability p {
    margin: 0;
    font-size: 12px;
}

.legend {
    display: flex;
    flex-wrap: wrap;
    gap: 18px;
    margin-top: 19px;
    padding: 15px 18px;
    border: 1px solid #e9eef4;
    border-radius: 10px;
    background: white;
}

.legend span {
    display: flex;
    align-items: center;
    gap: 7px;
    color: #718094;
    font-size: 11px;
}

.legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
}

.legend-dot.programado { background: #e1ad45; }
.legend-dot.confirmado { background: #2796d1; }
.legend-dot.en-espera { background: #a675c5; }
.legend-dot.atendido { background: #36a779; }
.legend-dot.cancelado { background: #d66a6a; }

@media (max-width: 1050px) {
    .agenda-columns {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 800px) {
    .summary-grid {
        grid-template-columns: 1fr;
    }

    .filters-card {
        align-items: stretch;
        flex-direction: column;
    }

    .filter-group {
        min-width: 0;
    }

    .today-button {
        align-self: flex-start;
    }
}

@media (max-width: 600px) {
    .agenda-view {
        padding: 20px 15px;
    }

    .schedule-section,
    .availability-section {
        padding: 15px;
    }

    .appointment-row {
        grid-template-columns: 55px minmax(0, 1fr);
    }

    .appointment-duration {
        display: none;
    }

    .status-badge {
        grid-column: 2;
    }
}
</style>
