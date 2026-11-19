
<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

// ==========================================
// TIPOS
// ==========================================

type Destino =
    | "turnos"
    | "agenda"
    | "pacientes"
    | "triaje"
    | "lista-espera";

type EstadoTurno =
    | "Programado"
    | "Confirmado"
    | "En Sala de Espera"
    | "Atendido"
    | "Cancelado";

type EstadoTriaje =
    | "EN_ESPERA"
    | "EN_ATENCION"
    | "ATENDIDO";

type NivelUrgencia = "ROJO" | "AMARILLO" | "VERDE";

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

interface Turno {
    id: number;
    idPaciente: number;
    idMedico: number;
    fechaHoraInicio: string;
    fechaHoraFin: string;
    estado: EstadoTurno;
}

interface SolicitudEspera {
    id: number;
    idPaciente: number;
    idMedico: number;
    fechaSolicitada: string;
    fechaHoraIngreso: string;
    estado: "EN_ESPERA" | "ASIGNADO" | "CANCELADO";
}

interface Triaje {
    id: number;
    idPaciente: number;
    nivelUrgencia: NivelUrgencia;
    observaciones: string | null;
    fechaHoraIngreso: string;
    estado: EstadoTriaje;
}

interface RespuestaTurnos {
    turnos: unknown[];
}

interface RespuestaPacientes {
    pacientes: unknown[];
}

interface RespuestaMedicos {
    medicos: unknown[];
}

interface RespuestaListaEspera {
    solicitudes: unknown[];
}

interface RespuestaTriaje {
    triajes: unknown[];
}

interface Indicador {
    titulo: string;
    valor: number;
    detalle: string;
    icono: string;
    color: string;
}

interface TurnoDashboard {
    id: number;
    hora: string;
    paciente: string;
    dni: string;
    medico: string;
    estado: EstadoTurno;
    clase: string;
}

interface PacienteDashboard {
    id: number;
    nombre: string;
    medico: string;
    fecha: string;
    posicion: number;
}

interface AlertaDashboard {
    id: number;
    paciente: string;
    nivel: NivelUrgencia;
    descripcion: string;
    hora: string;
}

// ==========================================
// ESTADO
// ==========================================

const medicos = ref<Medico[]>([]);
const pacientes = ref<Paciente[]>([]);
const turnos = ref<Turno[]>([]);
const solicitudesEspera = ref<SolicitudEspera[]>([]);
const triajes = ref<Triaje[]>([]);

const cargando = ref(false);
const error = ref("");

const fechaActual = computed(() => {
    return new Intl.DateTimeFormat("es-AR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    }).format(new Date());
});

function obtenerFechaLocal(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
}

const hoy = obtenerFechaLocal(new Date());

// ==========================================
// NAVEGACIÓN
// ==========================================

const emit = defineEmits<{
    (event: "navegar", destino: Destino): void;
}>();

function navegar(destino: Destino): void {
    emit("navegar", destino);
}

// ==========================================
// UTILIDADES DE API Y NORMALIZACIÓN
// ==========================================

async function solicitarAPI<T>(
    url: string,
    opciones: RequestInit = {}
): Promise<T> {
    const respuesta = await fetch(url, {
        ...opciones,
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
            ...opciones.headers
        }
    });

    const datos = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok) {
        const mensaje =
            datos &&
            typeof datos === "object" &&
            "mensaje" in datos &&
            typeof datos.mensaje === "string"
                ? datos.mensaje
                : `Error HTTP ${respuesta.status}`;

        throw new Error(mensaje);
    }

    return datos as T;
}

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

function convertirNumero(valor: unknown): number {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : 0;
}

function normalizarMedico(datos: unknown): Medico {
    const objeto = datos as Record<string, unknown>;

    return {
        id: convertirNumero(obtenerPropiedad(objeto, "id", "_id")),
        nombre: String(
            obtenerPropiedad(objeto, "nombre", "_nombre") ?? ""
        ),
        apellido: String(
            obtenerPropiedad(objeto, "apellido", "_apellido") ?? ""
        )
    };
}

function normalizarPaciente(datos: unknown): Paciente {
    const objeto = datos as Record<string, unknown>;

    return {
        id: convertirNumero(obtenerPropiedad(objeto, "id", "_id")),
        nombre: String(
            obtenerPropiedad(objeto, "nombre", "_nombre") ?? ""
        ),
        apellido: String(
            obtenerPropiedad(objeto, "apellido", "_apellido") ?? ""
        ),
        dni: String(
            obtenerPropiedad(objeto, "dni", "_dni") ?? "-"
        )
    };
}

function normalizarTurno(datos: unknown): Turno {
    const objeto = datos as Record<string, unknown>;

    return {
        id: convertirNumero(obtenerPropiedad(objeto, "id", "_id")),
        idPaciente: convertirNumero(
            obtenerPropiedad(objeto, "idPaciente", "_idPaciente")
        ),
        idMedico: convertirNumero(
            obtenerPropiedad(objeto, "idMedico", "_idMedico")
        ),
        fechaHoraInicio: String(
            obtenerPropiedad(
                objeto,
                "fechaHoraInicio",
                "_fechaHoraInicio"
            ) ?? ""
        ),
        fechaHoraFin: String(
            obtenerPropiedad(
                objeto,
                "fechaHoraFin",
                "_fechaHoraFin"
            ) ?? ""
        ),
        estado: String(
            obtenerPropiedad(objeto, "estado", "_estado") ?? "Programado"
        ) as EstadoTurno
    };
}

function normalizarSolicitud(datos: unknown): SolicitudEspera {
    const objeto = datos as Record<string, unknown>;

    return {
        id: convertirNumero(obtenerPropiedad(objeto, "id", "_id")),
        idPaciente: convertirNumero(
            obtenerPropiedad(objeto, "idPaciente", "_idPaciente")
        ),
        idMedico: convertirNumero(
            obtenerPropiedad(objeto, "idMedico", "_idMedico")
        ),
        fechaSolicitada: String(
            obtenerPropiedad(
                objeto,
                "fechaSolicitada",
                "_fechaSolicitada"
            ) ?? ""
        ),
        fechaHoraIngreso: String(
            obtenerPropiedad(
                objeto,
                "fechaHoraIngreso",
                "_fechaHoraIngreso"
            ) ?? ""
        ),
        estado: String(
            obtenerPropiedad(objeto, "estado", "_estado") ?? "EN_ESPERA"
        ) as SolicitudEspera["estado"]
    };
}

function normalizarTriaje(datos: unknown): Triaje {
    const objeto = datos as Record<string, unknown>;

    const observaciones = obtenerPropiedad(
        objeto,
        "observaciones",
        "_observaciones"
    );

    return {
        id: convertirNumero(obtenerPropiedad(objeto, "id", "_id")),
        idPaciente: convertirNumero(
            obtenerPropiedad(objeto, "idPaciente", "_idPaciente")
        ),
        nivelUrgencia: String(
            obtenerPropiedad(
                objeto,
                "nivelUrgencia",
                "_nivelUrgencia"
            ) ?? "VERDE"
        ) as NivelUrgencia,
        observaciones:
            typeof observaciones === "string" ? observaciones : null,
        fechaHoraIngreso: String(
            obtenerPropiedad(
                objeto,
                "fechaHoraIngreso",
                "_fechaHoraIngreso"
            ) ?? ""
        ),
        estado: String(
            obtenerPropiedad(objeto, "estado", "_estado") ?? "EN_ESPERA"
        ) as EstadoTriaje
    };
}

// ==========================================
// FORMATO DE FECHAS Y HORARIOS
// ==========================================

function formatearHora(fechaHora: string): string {
    if (!fechaHora) return "--:--";

    const fecha = new Date(fechaHora);

    if (Number.isNaN(fecha.getTime())) return "--:--";

    return new Intl.DateTimeFormat("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    }).format(fecha);
}

function formatearFechaCorta(fecha: string): string {
    if (!fecha) return "-";

    if (fecha === hoy) return "Hoy";

    const manana = new Date();
    manana.setDate(manana.getDate() + 1);

    if (fecha === obtenerFechaLocal(manana)) return "Mañana";

    const [anio, mes, dia] = fecha.slice(0, 10).split("-");
    return `${dia}/${mes}/${anio}`;
}

// ==========================================
// OBTENER INFORMACIÓN DE PACIENTES Y MÉDICOS
// ==========================================

function obtenerNombrePaciente(idPaciente: number): string {
    const paciente = pacientes.value.find(
        (item) => item.id === idPaciente
    );

    return paciente
        ? `${paciente.nombre} ${paciente.apellido}`.trim()
        : `Paciente #${idPaciente}`;
}

function obtenerDNI(idPaciente: number): string {
    return pacientes.value.find(
        (item) => item.id === idPaciente
    )?.dni ?? "-";
}

function obtenerNombreMedico(idMedico: number): string {
    const medico = medicos.value.find(
        (item) => item.id === idMedico
    );

    return medico
        ? `${medico.nombre} ${medico.apellido}`.trim()
        : `Médico #${idMedico}`;
}

// ==========================================
// CARGA DE AGENDA
// ==========================================

async function cargarAgenda(): Promise<void> {
    const respuestaMedicos = await solicitarAPI<RespuestaMedicos>(
        "/api/admisiones/medicos"
    );

    if (!Array.isArray(respuestaMedicos.medicos)) {
        throw new Error(
            "La API de médicos devolvió un formato inválido."
        );
    }

    medicos.value = respuestaMedicos.medicos.map(normalizarMedico);

    // Consultamos la agenda de cada médico para obtener
    // todos los turnos registrados para el día actual.

    const agendas = await Promise.all(
        medicos.value.map((medico) =>
            solicitarAPI<RespuestaTurnos>(
                `/api/admisiones/turnos/agenda?idMedico=${medico.id}&fecha=${hoy}`
            )
        )
    );

    const todosLosTurnos = agendas.flatMap((agenda) => {
        if (!Array.isArray(agenda.turnos)) {
            throw new Error(
                "La API de agenda devolvió un formato inválido."
            );
        }

        return agenda.turnos.map(normalizarTurno);
    });

    turnos.value = todosLosTurnos;
}

// ==========================================
// CARGA DE DATOS AUXILIARES
// ==========================================

async function cargarDatosAuxiliares(): Promise<void> {
    const resultados = await Promise.allSettled([
        solicitarAPI<RespuestaPacientes>(
            "/api/admisiones/pacientes"
        ),
        solicitarAPI<RespuestaListaEspera>(
            "/api/admisiones/lista-espera?estado=EN_ESPERA"
        ),
        solicitarAPI<RespuestaTriaje>(
            "/api/admisiones/triaje"
        )
    ]);

    const [
        resultadoPacientes,
        resultadoEspera,
        resultadoTriaje
    ] = resultados;

    if (resultadoPacientes.status === "fulfilled") {
        pacientes.value = Array.isArray(
            resultadoPacientes.value.pacientes
        )
            ? resultadoPacientes.value.pacientes.map(normalizarPaciente)
            : [];
    }

    if (resultadoEspera.status === "fulfilled") {
        solicitudesEspera.value = Array.isArray(
            resultadoEspera.value.solicitudes
        )
            ? resultadoEspera.value.solicitudes.map(normalizarSolicitud)
            : [];
    }

    if (resultadoTriaje.status === "fulfilled") {
        triajes.value = Array.isArray(
            resultadoTriaje.value.triajes
        )
            ? resultadoTriaje.value.triajes.map(normalizarTriaje)
            : [];
    }
}

// ==========================================
// CARGA GENERAL
// ==========================================

async function cargarDatos(): Promise<void> {
    if (cargando.value) return;

    cargando.value = true;
    error.value = "";

    try {
        // Primero cargamos la agenda.
        // Los errores de otros módulos no deben impedirlo.
        await cargarAgenda();
    } catch (err) {
        error.value = err instanceof Error
            ? `No se pudo cargar la agenda: ${err.message}`
            : "No se pudo cargar la agenda.";

        turnos.value = [];
    }

    // Después cargamos pacientes, lista de espera y triaje
    // de manera independiente.
    await cargarDatosAuxiliares();

    cargando.value = false;
}

onMounted(() => {
    void cargarDatos();
});

// ==========================================
// INDICADORES REALES
// ==========================================

const cantidadConfirmados = computed(() =>
    turnos.value.filter(
        (turno) => turno.estado === "Confirmado"
    ).length
);

const cantidadEnEspera = computed(() =>
    turnos.value.filter(
        (turno) => turno.estado === "En Sala de Espera"
    ).length
);

const cantidadCancelados = computed(() =>
    turnos.value.filter(
        (turno) => turno.estado === "Cancelado"
    ).length
);

const indicadores = computed<Indicador[]>(() => [
    {
        titulo: "Turnos de hoy",
        valor: turnos.value.length,
        detalle: "Total de citas registradas para hoy",
        icono: "▦",
        color: "blue"
    },
    {
        titulo: "Confirmados",
        valor: cantidadConfirmados.value,
        detalle: "Pacientes con turno confirmado",
        icono: "✓",
        color: "green"
    },
    {
        titulo: "En sala de espera",
        valor: cantidadEnEspera.value,
        detalle: "Pacientes esperando atención",
        icono: "◷",
        color: "orange"
    },
    {
        titulo: "Cancelados",
        valor: cantidadCancelados.value,
        detalle: "Turnos cancelados para hoy",
        icono: "×",
        color: "red"
    }
]);

// ==========================================
// TODOS LOS TURNOS DEL DÍA
// ==========================================

const proximosTurnos = computed<TurnoDashboard[]>(() => {
    return turnos.value
        .filter((turno) => {
            const fecha = new Date(turno.fechaHoraInicio);

            return (
                !Number.isNaN(fecha.getTime()) &&
                obtenerFechaLocal(fecha) === hoy
            );
        })
        .sort(
            (a, b) =>
                new Date(a.fechaHoraInicio).getTime() -
                new Date(b.fechaHoraInicio).getTime()
        )
        .map((turno) => {
            let clase = "programado";

            switch (turno.estado) {
                case "Confirmado":
                    clase = "confirmado";
                    break;
                case "En Sala de Espera":
                    clase = "espera";
                    break;
                case "Atendido":
                    clase = "atendido";
                    break;
                case "Cancelado":
                    clase = "cancelado";
                    break;
            }

            return {
                id: turno.id,
                hora: formatearHora(turno.fechaHoraInicio),
                paciente: obtenerNombrePaciente(turno.idPaciente),
                dni: obtenerDNI(turno.idPaciente),
                medico: obtenerNombreMedico(turno.idMedico),
                estado: turno.estado,
                clase
            };
        });
});

// ==========================================
// LISTA DE ESPERA
// ==========================================

const pacientesEnEspera = computed<PacienteDashboard[]>(() =>
    [...solicitudesEspera.value]
        .filter(
            (solicitud) => solicitud.estado === "EN_ESPERA"
        )
        .sort(
            (a, b) =>
                new Date(a.fechaHoraIngreso).getTime() -
                new Date(b.fechaHoraIngreso).getTime()
        )
        .slice(0, 3)
        .map((solicitud, indice) => ({
            id: solicitud.id,
            nombre: obtenerNombrePaciente(solicitud.idPaciente),
            medico: obtenerNombreMedico(solicitud.idMedico),
            fecha: formatearFechaCorta(solicitud.fechaSolicitada),
            posicion: indice + 1
        }))
);

// ==========================================
// ALERTAS DE TRIAJE
// ==========================================

const alertasTriaje = computed<AlertaDashboard[]>(() =>
    [...triajes.value]
        .filter(
            (triaje) =>
                triaje.estado === "EN_ESPERA" ||
                triaje.estado === "EN_ATENCION"
        )
        .sort((a, b) => {
            const prioridad: Record<NivelUrgencia, number> = {
                ROJO: 1,
                AMARILLO: 2,
                VERDE: 3
            };

            return (
                prioridad[a.nivelUrgencia] -
                    prioridad[b.nivelUrgencia] ||
                new Date(a.fechaHoraIngreso).getTime() -
                    new Date(b.fechaHoraIngreso).getTime()
            );
        })
        .slice(0, 4)
        .map((triaje) => ({
            id: triaje.id,
            paciente: obtenerNombrePaciente(triaje.idPaciente),
            nivel: triaje.nivelUrgencia,
            descripcion:
                triaje.observaciones?.trim() ||
                (triaje.estado === "EN_ATENCION"
                    ? "Paciente en atención"
                    : "Pendiente de atención"),
            hora: formatearHora(triaje.fechaHoraIngreso)
        }))
);
</script>

<template>
    <main class="dashboard">
        <!-- ENCABEZADO -->
        <header class="dashboard-header">
            <div class="header-info">
                <span class="eyebrow">ADMISIÓN / FRONT DESK</span>

                <h1>Panel de admisión</h1>

                <p>
                    Bienvenido. Este es el resumen general de actividad del hospital.
                </p>

                <span class="fecha-actual">
                    {{ fechaActual }}
                </span>
            </div>

            <button
                type="button"
                class="refresh-button"
                :disabled="cargando"
                @click="cargarDatos"
            >
                {{ cargando ? "Actualizando..." : "↻ Actualizar" }}
            </button>
        </header>

        <!-- MENSAJES -->
        <div v-if="error" class="feedback error">
            <span>{{ error }}</span>

            <button
                type="button"
                @click="cargarDatos"
            >
                Reintentar
            </button>
        </div>

        <!-- INDICADORES -->
        <section class="indicators-grid">
            <article
                v-for="indicador in indicadores"
                :key="indicador.titulo"
                class="indicator-card"
            >
                <div class="indicator-top">
                    <span class="indicator-title">
                        {{ indicador.titulo }}
                    </span>

                    <span
                        class="indicator-icon"
                        :class="`icon-${indicador.color}`"
                    >
                        {{ indicador.icono }}
                    </span>
                </div>

                <strong class="indicator-value">
                    {{ cargando ? "—" : indicador.valor }}
                </strong>

                <span class="indicator-detail">
                    {{ indicador.detalle }}
                </span>
            </article>
        </section>

        <!-- CONTENIDO PRINCIPAL -->
        <section class="dashboard-content">
            <!-- TURNOS DEL DÍA -->
            <article class="panel appointments-panel">
                <div class="panel-header">
                    <div>
                        <h2>Turnos de hoy</h2>
                        <p>Todos los turnos registrados para el día</p>
                    </div>

                    <button
                        type="button"
                        class="text-button"
                        @click="navegar('turnos')"
                    >
                        Ver todos →
                    </button>
                </div>

                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Horario</th>
                                <th>Paciente</th>
                                <th>Médico</th>
                                <th>Estado</th>
                            </tr>
                        </thead>

                        <tbody>
                            <tr
                                v-for="turno in proximosTurnos"
                                :key="turno.id"
                            >
                                <td class="time-cell">
                                    {{ turno.hora }}
                                </td>

                                <td>
                                    <div class="patient-name">
                                        {{ turno.paciente }}
                                    </div>

                                    <span class="patient-dni">
                                        DNI: {{ turno.dni }}
                                    </span>
                                </td>

                                <td>{{ turno.medico }}</td>

                                <td>
                                    <span
                                        class="status-badge"
                                        :class="`status-${turno.clase}`"
                                    >
                                        {{ turno.estado }}
                                    </span>
                                </td>
                            </tr>

                            <tr
                                v-if="!cargando && proximosTurnos.length === 0"
                            >
                                <td colspan="4" class="empty-cell">
                                    No hay turnos registrados para hoy.
                                </td>
                            </tr>

                            <tr v-if="cargando">
                                <td colspan="4" class="empty-cell">
                                    Cargando agenda...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </article>

            <!-- COLUMNA DERECHA -->
            <div class="right-column">
                <!-- LISTA DE ESPERA -->
                <article class="panel">
                    <div class="panel-header">
                        <div>
                            <h2>Lista de espera</h2>
                            <p>Pacientes pendientes</p>
                        </div>

                        <button
                            type="button"
                            class="text-button"
                            @click="navegar('lista-espera')"
                        >
                            Ver →
                        </button>
                    </div>

                    <div class="waiting-list">
                        <div
                            v-for="paciente in pacientesEnEspera"
                            :key="paciente.id"
                            class="waiting-item"
                        >
                            <div class="waiting-number">
                                {{ paciente.posicion }}
                            </div>

                            <div class="waiting-info">
                                <strong>{{ paciente.nombre }}</strong>

                                <span>
                                    {{ paciente.medico }}
                                    · {{ paciente.fecha }}
                                </span>
                            </div>
                        </div>

                        <div
                            v-if="!cargando && pacientesEnEspera.length === 0"
                            class="empty-small"
                        >
                            No hay pacientes en lista de espera.
                        </div>

                        <div v-if="cargando" class="empty-small">
                            Cargando lista de espera...
                        </div>
                    </div>
                </article>

                <!-- ALERTAS DE TRIAJE -->
                <article class="panel triage-panel">
                    <div class="panel-header">
                        <div>
                            <h2>Triaje de guardia</h2>
                            <p>Clasificaciones pendientes</p>
                        </div>

                        <button
                            type="button"
                            class="text-button"
                            @click="navegar('triaje')"
                        >
                            Ver →
                        </button>
                    </div>

                    <div
                        v-for="alerta in alertasTriaje"
                        :key="alerta.id"
                        class="triage-alert"
                        :class="`triage-${alerta.nivel.toLowerCase()}`"
                    >
                        <div class="triage-alert-top">
                            <strong>{{ alerta.nivel }}</strong>
                            <span>{{ alerta.hora }}</span>
                        </div>

                        <strong class="triage-patient">
                            {{ alerta.paciente }}
                        </strong>

                        <p>{{ alerta.descripcion }}</p>
                    </div>

                    <div
                        v-if="!cargando && alertasTriaje.length === 0"
                        class="empty-small"
                    >
                        No hay pacientes pendientes de atención en triaje.
                    </div>

                    <div v-if="cargando" class="empty-small">
                        Cargando triajes...
                    </div>
                </article>
            </div>
        </section>

        <div class="data-notice">
            Los indicadores y listados se actualizan con información obtenida de la API del hospital.
        </div>
    </main>
</template>

<style scoped>
.dashboard {
    width: 100%;
    max-width: 1500px;
    margin: 0 auto;
    padding: 30px;
    color: #1e293b;
    box-sizing: border-box;
}

/* ENCABEZADO */
.dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;
    margin-bottom: 30px;
}

.eyebrow {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.3px;
    color: #64748b;
}

.header-info h1 {
    font-size: 28px;
    margin: 8px 0;
    font-weight: 700;
}

.header-info p {
    color: #64748b;
    margin: 0 0 10px;
    font-size: 14px;
}

.fecha-actual {
    color: #64748b;
    font-size: 13px;
    text-transform: capitalize;
}

button {
    font-family: inherit;
    cursor: pointer;
}

.refresh-button {
    padding: 10px 14px;
    border: 1px solid #dbe5ef;
    border-radius: 8px;
    background: white;
    color: #2563eb;
    font-size: 12px;
    font-weight: 600;
}

.refresh-button:disabled {
    cursor: wait;
    opacity: 0.6;
}

.feedback {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 18px;
    padding: 12px 15px;
    border-radius: 8px;
    font-size: 12px;
}

.feedback.error {
    background: #fef2f2;
    color: #b91c1c;
}

.feedback button {
    padding: 6px 10px;
    border: 1px solid #fecaca;
    border-radius: 6px;
    background: white;
    color: #b91c1c;
    font-size: 11px;
}

/* INDICADORES */
.indicators-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 17px;
    margin-bottom: 25px;
}

.indicator-card {
    background: white;
    border: 1px solid #e8edf3;
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 9px;
}

.indicator-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.indicator-title {
    font-size: 13px;
    color: #64748b;
    font-weight: 500;
}

.indicator-icon {
    width: 34px;
    height: 34px;
    border-radius: 9px;
    display: grid;
    place-items: center;
    font-weight: 700;
    font-size: 19px;
}

.icon-blue {
    background: #eff6ff;
    color: #2563eb;
}

.icon-green {
    background: #ecfdf5;
    color: #059669;
}

.icon-orange {
    background: #fff7ed;
    color: #ea580c;
}

.icon-red {
    background: #fef2f2;
    color: #dc2626;
}

.indicator-value {
    font-size: 30px;
    font-weight: 700;
    color: #1e293b;
}

.indicator-detail {
    font-size: 12px;
    color: #94a3b8;
}

/* CONTENIDO */
.dashboard-content {
    display: grid;
    grid-template-columns: 1.55fr 1fr;
    gap: 20px;
    align-items: start;
}

.right-column {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.panel {
    background: white;
    border: 1px solid #e8edf3;
    border-radius: 12px;
    padding: 21px;
    min-width: 0;
}

.panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
}

.panel-header h2 {
    font-size: 15px;
    margin: 0 0 5px;
    font-weight: 700;
}

.panel-header p {
    margin: 0;
    color: #94a3b8;
    font-size: 12px;
}

.text-button {
    background: transparent;
    border: none;
    color: #2563eb;
    font-size: 12px;
    font-weight: 600;
}

/* TABLA DE TURNOS */
.table-container {
    width: 100%;
    overflow-x: auto;
}

table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
    white-space: nowrap;
}

th {
    padding: 12px 10px;
    color: #94a3b8;
    font-size: 11px;
    font-weight: 600;
    border-bottom: 1px solid #edf0f4;
}

td {
    padding: 15px 10px;
    border-bottom: 1px solid #f1f5f9;
    font-size: 12px;
}

tbody tr:last-child td {
    border-bottom: none;
}

.time-cell {
    font-weight: 700;
    color: #2563eb;
}

.patient-name {
    font-weight: 600;
    color: #334155;
}

.patient-dni {
    display: block;
    font-size: 11px;
    color: #94a3b8;
    margin-top: 4px;
}

.status-badge {
    display: inline-block;
    padding: 5px 9px;
    border-radius: 20px;
    font-size: 10px;
    font-weight: 600;
}

.status-confirmado {
    background: #ecfdf5;
    color: #047857;
}

.status-programado {
    background: #eff6ff;
    color: #1d4ed8;
}

.status-espera {
    background: #fff7ed;
    color: #c2410c;
}

.status-atendido {
    background: #f0fdf4;
    color: #15803d;
}

.status-cancelado {
    background: #fef2f2;
    color: #b91c1c;
}

.empty-cell {
    padding: 28px 12px;
    color: #94a3b8;
    text-align: center;
    white-space: normal;
}

/* LISTA DE ESPERA */
.waiting-list {
    display: flex;
    flex-direction: column;
}

.waiting-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 0;
    border-bottom: 1px solid #f1f5f9;
}

.waiting-item:last-child {
    border-bottom: none;
}

.waiting-number {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: #eff6ff;
    color: #2563eb;
    display: grid;
    place-items: center;
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
}

.waiting-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
}

.waiting-info strong {
    font-size: 12px;
    color: #334155;
}

.waiting-info span {
    font-size: 11px;
    color: #94a3b8;
}

.empty-small {
    padding: 14px 0;
    color: #94a3b8;
    font-size: 12px;
    text-align: center;
}

/* TRIAJE */
.triage-alert {
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 10px;
}

.triage-alert:last-child {
    margin-bottom: 0;
}

.triage-rojo {
    background: #fef2f2;
    border-left: 3px solid #dc2626;
}

.triage-amarillo {
    background: #fffbeb;
    border-left: 3px solid #d97706;
}

.triage-verde {
    background: #f0fdf4;
    border-left: 3px solid #16a34a;
}

.triage-alert-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.triage-alert-top strong {
    font-size: 11px;
    font-weight: 800;
}

.triage-rojo .triage-alert-top strong {
    color: #dc2626;
}

.triage-amarillo .triage-alert-top strong {
    color: #b45309;
}

.triage-verde .triage-alert-top strong {
    color: #15803d;
}

.triage-alert-top span {
    color: #94a3b8;
    font-size: 10px;
}

.triage-patient {
    display: block;
    margin-top: 7px;
    color: #475569;
    font-size: 11px;
}

.triage-alert p {
    font-size: 11px;
    color: #64748b;
    margin: 5px 0 0;
}

/* AVISO */
.data-notice {
    margin-top: 22px;
    padding: 12px;
    border-radius: 8px;
    background: #f8fafc;
    color: #64748b;
    font-size: 11px;
}

/* RESPONSIVE */
@media (max-width: 1100px) {
    .indicators-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .dashboard-content {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 600px) {
    .dashboard {
        padding: 18px;
    }

    .dashboard-header {
        flex-direction: column;
    }

    .indicators-grid {
        grid-template-columns: 1fr 1fr;
        gap: 10px;
    }

    .indicator-card {
        padding: 14px;
    }

    .indicator-value {
        font-size: 25px;
    }
}
</style>
