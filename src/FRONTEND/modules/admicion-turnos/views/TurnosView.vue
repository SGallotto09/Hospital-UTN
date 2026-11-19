<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";

type EstadoTurno =
    | "Programado"
    | "Confirmado"
    | "En Sala de Espera"
    | "Atendido"
    | "Cancelado";

interface Paciente {
    id: number;
    nombre: string;
    apellido: string;
    dni: string;
}

interface Medico {
    id: number;
    nombre: string;
    apellido: string;
}

interface Turno {
    id: number;
    idPaciente: number;
    idMedico: number;
    fecha: string;
    horaInicio: string;
    horaFin: string;
    estado: EstadoTurno;
    costo: number;
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

interface RespuestaPacientes {
    pacientes: Paciente[];
}

interface RespuestaMedicos {
    medicos: Medico[];
}

interface RespuestaTurnos {
    turnos: TurnoApi[];
}

interface RespuestaMensaje {
    mensaje?: string;
}

function obtenerFechaLocal(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
}

function convertirHoraAMinutos(hora: string): number {
    const partes = hora.split(":");
    const horas = Number(partes[0] ?? 0);
    const minutos = Number(partes[1] ?? 0);

    return horas * 60 + minutos;
}

function convertirMinutosAHora(minutos: number): string {
    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;

    return `${String(horas).padStart(2, "0")}:${String(resto).padStart(2, "0")}`;
}

function convertirTurnoApi(turno: TurnoApi): Turno {
    const inicio = new Date(turno.fechaHoraInicio);
    const fin = new Date(turno.fechaHoraFin);

    return {
        id: turno.id,
        idPaciente: turno.idPaciente,
        idMedico: turno.idMedico,
        fecha: obtenerFechaLocal(inicio),
        horaInicio: `${String(inicio.getHours()).padStart(2, "0")}:${String(inicio.getMinutes()).padStart(2, "0")}`,
        horaFin: `${String(fin.getHours()).padStart(2, "0")}:${String(fin.getMinutes()).padStart(2, "0")}`,
        estado: turno.estado,
        costo: Number(turno.costo)
    };
}

const fechaHoy = obtenerFechaLocal(new Date());

const pacientes = ref<Paciente[]>([]);
const medicos = ref<Medico[]>([]);
const turnos = ref<Turno[]>([]);

const fechaSeleccionada = ref(fechaHoy);
const busqueda = ref("");
const filtroEstado = ref<EstadoTurno | "Todos">("Todos");

const mostrarFormulario = ref(false);
const cargando = ref(false);
const cargandoTurnos = ref(false);
const registrando = ref(false);

const mensaje = ref("");
const error = ref("");
const errorCarga = ref("");

const nuevoTurno = reactive({
    idPaciente: 0,
    idMedico: 0,
    fecha: fechaHoy,
    horaInicio: "",
    costo: 15000
});

// =====================================================
// CARGAR PACIENTES, MÉDICOS Y TURNOS
// =====================================================

async function cargarDatos() {
    cargando.value = true;
    errorCarga.value = "";

    try {
        const [respuestaPacientes, respuestaMedicos] = await Promise.all([
            fetch("/api/admisiones/pacientes", {
                method: "GET",
                credentials: "same-origin"
            }),
            fetch("/api/admisiones/medicos", {
                method: "GET",
                credentials: "same-origin"
            })
        ]);

        if (
            respuestaPacientes.status === 401 ||
            respuestaMedicos.status === 401
        ) {
            throw new Error("Tu sesión expiró. Volvé a iniciar sesión.");
        }

        if (!respuestaPacientes.ok || !respuestaMedicos.ok) {
            throw new Error(
                "No se pudieron cargar los pacientes o los médicos."
            );
        }

        const datosPacientes =
            await respuestaPacientes.json() as RespuestaPacientes;
        const datosMedicos =
            await respuestaMedicos.json() as RespuestaMedicos;

        if (
            !Array.isArray(datosPacientes.pacientes) ||
            !Array.isArray(datosMedicos.medicos)
        ) {
            throw new Error("El servidor devolvió información inválida.");
        }

        pacientes.value = datosPacientes.pacientes;
        medicos.value = datosMedicos.medicos;

        await cargarTurnosFecha(fechaSeleccionada.value);
    } catch (err) {
        errorCarga.value = err instanceof Error
            ? err.message
            : "Ocurrió un error al cargar los datos.";
    } finally {
        cargando.value = false;
    }
}

// =====================================================
// CARGAR AGENDA DE TODOS LOS MÉDICOS PARA UNA FECHA
// =====================================================

async function cargarTurnosFecha(fecha: string) {
    if (!fecha) return;

    cargandoTurnos.value = true;
    errorCarga.value = "";

    try {
        const respuestas = await Promise.all(
            medicos.value.map(async (medico) => {
                const parametros = new URLSearchParams({
                    idMedico: String(medico.id),
                    fecha
                });

                const respuesta = await fetch(
                    `/api/admisiones/turnos/agenda?${parametros.toString()}`,
                    {
                        method: "GET",
                        credentials: "same-origin"
                    }
                );

                if (respuesta.status === 401) {
                    throw new Error(
                        "Tu sesión expiró. Volvé a iniciar sesión."
                    );
                }

                if (!respuesta.ok) {
                    throw new Error(
                        `No se pudo cargar la agenda de ${medico.nombre} ${medico.apellido}.`
                    );
                }

                const datos =
                    await respuesta.json() as RespuestaTurnos;

                if (!Array.isArray(datos.turnos)) {
                    throw new Error(
                        "El servidor devolvió una agenda inválida."
                    );
                }

                return datos.turnos.map(convertirTurnoApi);
            })
        );

        const turnosFecha = respuestas.flat();

        // Reemplazamos únicamente los turnos de la fecha consultada.
        turnos.value = [
            ...turnos.value.filter((turno) => turno.fecha !== fecha),
            ...turnosFecha
        ];
    } catch (err) {
        errorCarga.value = err instanceof Error
            ? err.message
            : "No se pudo cargar la agenda médica.";
    } finally {
        cargandoTurnos.value = false;
    }
}

// =====================================================
// DATOS CALCULADOS
// =====================================================

const turnosDelDia = computed(() =>
    turnos.value.filter(
        (turno) => turno.fecha === fechaSeleccionada.value
    )
);

const turnosActivos = computed(() =>
    turnosDelDia.value.filter(
        (turno) => turno.estado !== "Cancelado"
    )
);

const turnosPendientes = computed(() =>
    turnosActivos.value.filter(
        (turno) => turno.estado === "Programado"
    ).length
);

const turnosConfirmados = computed(() =>
    turnosActivos.value.filter(
        (turno) =>
            turno.estado === "Confirmado" ||
            turno.estado === "En Sala de Espera"
    ).length
);

const turnosCancelados = computed(() =>
    turnosDelDia.value.filter(
        (turno) => turno.estado === "Cancelado"
    ).length
);

// =====================================================
// FILTRAR TURNOS
// =====================================================

const turnosFiltrados = computed(() => {
    const texto = busqueda.value.toLowerCase().trim();

    return turnosDelDia.value.filter((turno) => {
        const paciente = pacientes.value.find(
            (item) => item.id === turno.idPaciente
        );
        const medico = medicos.value.find(
            (item) => item.id === turno.idMedico
        );

        const nombrePaciente =
            `${paciente?.nombre ?? ""} ${paciente?.apellido ?? ""}`.toLowerCase();
        const nombreMedico =
            `${medico?.nombre ?? ""} ${medico?.apellido ?? ""}`.toLowerCase();

        const coincideBusqueda =
            nombrePaciente.includes(texto) ||
            (paciente?.dni ?? "").includes(texto) ||
            nombreMedico.includes(texto);

        const coincideEstado =
            filtroEstado.value === "Todos" ||
            turno.estado === filtroEstado.value;

        return coincideBusqueda && coincideEstado;
    }).sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
});

// =====================================================
// HORARIOS DISPONIBLES
// =====================================================

const horariosDisponibles = computed(() => {
    const ocupados = turnos.value.filter(
        (turno) =>
            turno.fecha === nuevoTurno.fecha &&
            turno.idMedico === nuevoTurno.idMedico &&
            turno.estado !== "Cancelado"
    );

    const disponibles: string[] = [];
    const duracion = 30;

    // Horario de atención configurado actualmente: 08:00 a 17:00.
    for (
        let minutos = 8 * 60;
        minutos + duracion <= 17 * 60;
        minutos += 30
    ) {
        const horaInicio = convertirMinutosAHora(minutos);
        const horaFin = convertirMinutosAHora(minutos + duracion);

        const tieneConflicto = ocupados.some((turno) => {
            const inicioOcupado = convertirHoraAMinutos(turno.horaInicio);
            const finOcupado = convertirHoraAMinutos(turno.horaFin);

            return (
                inicioOcupado < convertirHoraAMinutos(horaFin) &&
                finOcupado > convertirHoraAMinutos(horaInicio)
            );
        });

        if (!tieneConflicto) {
            disponibles.push(horaInicio);
        }
    }

    return disponibles;
});

// =====================================================
// OBTENER DATOS PARA MOSTRAR
// =====================================================

function obtenerPaciente(id: number): string {
    const paciente = pacientes.value.find(
        (item) => item.id === id
    );

    return paciente
        ? `${paciente.apellido}, ${paciente.nombre}`
        : "Paciente no encontrado";
}

function obtenerDniPaciente(id: number): string {
    return pacientes.value.find(
        (item) => item.id === id
    )?.dni ?? "—";
}

function obtenerMedico(id: number): string {
    const medico = medicos.value.find(
        (item) => item.id === id
    );

    return medico
        ? `${medico.apellido}, ${medico.nombre}`
        : "Médico no encontrado";
}

function formatearFecha(fecha: string): string {
    const partes = fecha.split("-");
    const anio = partes[0] ?? "";
    const mes = partes[1] ?? "";
    const dia = partes[2] ?? "";

    return `${dia}/${mes}/${anio}`;
}

function formatearCosto(costo: number): string {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 0
    }).format(costo);
}

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

// =====================================================
// ACTUALIZAR HORARIOS AL CAMBIAR MÉDICO O FECHA
// =====================================================

async function actualizarHorarioDisponible() {
    if (!nuevoTurno.fecha || !nuevoTurno.idMedico) {
        nuevoTurno.horaInicio = "";
        return;
    }

    await cargarTurnosFecha(nuevoTurno.fecha);

    if (!horariosDisponibles.value.includes(nuevoTurno.horaInicio)) {
        nuevoTurno.horaInicio = horariosDisponibles.value[0] ?? "";
    }
}

// =====================================================
// ABRIR FORMULARIO
// =====================================================

function abrirFormulario() {
    error.value = "";
    mensaje.value = "";
    errorCarga.value = "";

    if (pacientes.value.length === 0 || medicos.value.length === 0) {
        errorCarga.value =
            "Necesitás tener al menos un paciente y un médico registrados para reservar un turno.";
        return;
    }

    nuevoTurno.idPaciente = pacientes.value[0]?.id ?? 0;
    nuevoTurno.idMedico = medicos.value[0]?.id ?? 0;
    nuevoTurno.fecha = fechaSeleccionada.value;
    nuevoTurno.costo = 15000;
    nuevoTurno.horaInicio = "";

    mostrarFormulario.value = true;
    void actualizarHorarioDisponible();
}

// =====================================================
// RESERVAR TURNO
// =====================================================

async function registrarTurno() {
    if (registrando.value) return;

    error.value = "";
    mensaje.value = "";

    const pacienteExiste = pacientes.value.some(
        (paciente) => paciente.id === nuevoTurno.idPaciente
    );
    const medicoExiste = medicos.value.some(
        (medico) => medico.id === nuevoTurno.idMedico
    );

    if (!pacienteExiste || !medicoExiste) {
        error.value = "Seleccioná un paciente y un médico válidos.";
        return;
    }

    if (
        !nuevoTurno.horaInicio ||
        !horariosDisponibles.value.includes(nuevoTurno.horaInicio)
    ) {
        error.value =
            "El horario seleccionado ya no está disponible. Elegí otro.";
        return;
    }

    if (!Number.isSafeInteger(nuevoTurno.costo) || nuevoTurno.costo < 0) {
        error.value =
            "El costo debe ser un número entero igual o mayor a cero.";
        return;
    }

    const inicioMinutos = convertirHoraAMinutos(nuevoTurno.horaInicio);
    const horaFin = convertirMinutosAHora(inicioMinutos + 30);

    const fechaHoraInicio = new Date(
        `${nuevoTurno.fecha}T${nuevoTurno.horaInicio}:00`
    );
    const fechaHoraFin = new Date(
        `${nuevoTurno.fecha}T${horaFin}:00`
    );

    if (
        Number.isNaN(fechaHoraInicio.getTime()) ||
        Number.isNaN(fechaHoraFin.getTime())
    ) {
        error.value = "La fecha o el horario seleccionado no son válidos.";
        return;
    }

    registrando.value = true;

    try {
        const respuesta = await fetch("/api/admisiones/turnos", {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                idPaciente: nuevoTurno.idPaciente,
                idMedico: nuevoTurno.idMedico,
                fechaHoraInicio: fechaHoraInicio.toISOString(),
                fechaHoraFin: fechaHoraFin.toISOString(),
                costo: nuevoTurno.costo
            })
        });

        const datos = await respuesta.json().catch(() => ({})) as RespuestaMensaje;

        if (respuesta.status === 401) {
            error.value = "Tu sesión expiró. Volvé a iniciar sesión.";
            return;
        }

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje ?? "No se pudo reservar el turno."
            );
        }

        const fechaTurno = nuevoTurno.fecha;

        mostrarFormulario.value = false;
        fechaSeleccionada.value = fechaTurno;

        mensaje.value =
            datos.mensaje ?? "El turno fue reservado correctamente.";

        await cargarTurnosFecha(fechaTurno);
    } catch (err) {
        error.value = err instanceof Error
            ? err.message
            : "Ocurrió un error al reservar el turno.";
    } finally {
        registrando.value = false;
    }
}

// =====================================================
// CONFIRMAR TURNO
// =====================================================

async function confirmarTurno(id: number) {
    mensaje.value = "";
    errorCarga.value = "";

    const turno = turnos.value.find(
        (item) => item.id === id
    );

    if (!turno || turno.estado !== "Programado") return;

    try {
        const respuesta = await fetch(
            `/api/admisiones/turnos/${id}/estado`,
            {
                method: "PATCH",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    nuevoEstado: "Confirmado"
                })
            }
        );

        const datos = await respuesta.json().catch(() => ({})) as RespuestaMensaje;

        if (respuesta.status === 401) {
            throw new Error("Tu sesión expiró. Volvé a iniciar sesión.");
        }

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje ?? "No se pudo confirmar el turno."
            );
        }

        await cargarTurnosFecha(turno.fecha);

        mensaje.value =
            datos.mensaje ?? "El turno fue confirmado correctamente.";
    } catch (err) {
        errorCarga.value = err instanceof Error
            ? err.message
            : "Ocurrió un error al confirmar el turno.";
    }
}

// =====================================================
// CANCELAR TURNO
// =====================================================

async function cancelarTurno(id: number) {
    const turno = turnos.value.find(
        (item) => item.id === id
    );

    if (
        !turno ||
        turno.estado === "Cancelado" ||
        turno.estado === "Atendido"
    ) {
        return;
    }

    const confirmar = window.confirm(
        `¿Estás seguro de cancelar el turno de ${obtenerPaciente(turno.idPaciente)}?`
    );

    if (!confirmar) return;

    mensaje.value = "";
    errorCarga.value = "";

    try {
        const respuesta = await fetch(
            `/api/admisiones/turnos/${id}`,
            {
                method: "DELETE",
                credentials: "same-origin"
            }
        );

        const datos = await respuesta.json().catch(() => ({})) as RespuestaMensaje;

        if (respuesta.status === 401) {
            throw new Error("Tu sesión expiró. Volvé a iniciar sesión.");
        }

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje ?? "No se pudo cancelar el turno."
            );
        }

        await cargarTurnosFecha(turno.fecha);

        mensaje.value =
            datos.mensaje ?? "El turno fue cancelado correctamente.";
    } catch (err) {
        errorCarga.value = err instanceof Error
            ? err.message
            : "Ocurrió un error al cancelar el turno.";
    }
}

// =====================================================
// CARGA INICIAL
// =====================================================

onMounted(() => {
    void cargarDatos();
});
</script>

<template>
    <section class="turnos-view">
        <header class="page-header">
            <div>
                <span class="eyebrow">ADMISIONES</span>
                <h1>Gestión de turnos</h1>
                <p>Reservá, consultá y administrá los turnos médicos del hospital.</p>
            </div>

            <button class="btn-primary" type="button" @click="abrirFormulario">
                <span>＋</span>
                Nuevo turno
            </button>
        </header>

        <div v-if="mensaje" class="feedback success">
            {{ mensaje }}
            <button type="button" @click="mensaje = ''">×</button>
        </div>

        <div v-if="cargando" class="feedback">
            Cargando pacientes, médicos y turnos...
        </div>

        <div v-if="cargandoTurnos && !cargando" class="feedback">
            Actualizando la agenda...
        </div>

        <div v-if="errorCarga" class="feedback error">
            <span>{{ errorCarga }}</span>
            <button
                type="button"
                class="retry-button"
                @click="cargarDatos"
            >
                Reintentar
            </button>
        </div>

        <section class="summary-grid">
            <article class="summary-card">
                <div class="summary-icon blue">▦</div>
                <div>
                    <span>Turnos del día</span>
                    <strong>{{ turnosDelDia.length }}</strong>
                    <small>Incluye todos los estados</small>
                </div>
            </article>

            <article class="summary-card">
                <div class="summary-icon orange">◷</div>
                <div>
                    <span>Pendientes</span>
                    <strong>{{ turnosPendientes }}</strong>
                    <small>Programados sin confirmar</small>
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
                <div class="summary-icon red">×</div>
                <div>
                    <span>Cancelados</span>
                    <strong>{{ turnosCancelados }}</strong>
                    <small>Turnos cancelados en la fecha</small>
                </div>
            </article>
        </section>

        <section class="content-card">
            <div class="section-heading">
                <div>
                    <h2>Listado de turnos</h2>
                    <p>Consultá las reservas por fecha, paciente, médico o estado.</p>
                </div>
                <span class="result-count">{{ turnosFiltrados.length }} resultados</span>
            </div>

            <div class="filters">
                <label class="filter-group">
                    <span>Fecha</span>
                    <input
                        v-model="fechaSeleccionada"
                        type="date"
                        @change="cargarTurnosFecha(fechaSeleccionada)"
                    />
                </label>

                <label class="filter-group search-filter">
                    <span>Buscar</span>
                    <input
                        v-model="busqueda"
                        type="text"
                        placeholder="Paciente, DNI o médico..."
                    />
                </label>

                <label class="filter-group">
                    <span>Estado</span>
                    <select v-model="filtroEstado">
                        <option value="Todos">Todos los estados</option>
                        <option value="Programado">Programado</option>
                        <option value="Confirmado">Confirmado</option>
                        <option value="En Sala de Espera">En sala de espera</option>
                        <option value="Atendido">Atendido</option>
                        <option value="Cancelado">Cancelado</option>
                    </select>
                </label>
            </div>

            <div class="date-caption">
                Turnos correspondientes al {{ formatearFecha(fechaSeleccionada) }}
            </div>

            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Horario</th>
                            <th>Paciente</th>
                            <th>Médico</th>
                            <th>DNI</th>
                            <th>Costo</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>

                    <tbody>
                        <tr v-for="turno in turnosFiltrados" :key="turno.id">
                            <td>
                                <div class="time-cell">
                                    <strong>{{ turno.horaInicio }}</strong>
                                    <small>hasta {{ turno.horaFin }}</small>
                                </div>
                            </td>

                            <td>
                                <strong class="patient-name">
                                    {{ obtenerPaciente(turno.idPaciente) }}
                                </strong>
                            </td>

                            <td>{{ obtenerMedico(turno.idMedico) }}</td>
                            <td>{{ obtenerDniPaciente(turno.idPaciente) }}</td>
                            <td>{{ formatearCosto(turno.costo) }}</td>

                            <td>
                                <span
                                    class="status-badge"
                                    :class="obtenerEstadoClase(turno.estado)"
                                >
                                    {{ turno.estado }}
                                </span>
                            </td>

                            <td>
                                <div class="actions">
                                    <button
                                        v-if="turno.estado === 'Programado'"
                                        type="button"
                                        class="action-button confirm-action"
                                        @click="confirmarTurno(turno.id)"
                                    >
                                        Confirmar
                                    </button>

                                    <button
                                        v-if="
                                            turno.estado === 'Programado' ||
                                            turno.estado === 'Confirmado' ||
                                            turno.estado === 'En Sala de Espera'
                                        "
                                        type="button"
                                        class="action-button cancel-action"
                                        @click="cancelarTurno(turno.id)"
                                    >
                                        Cancelar
                                    </button>

                                    <span
                                        v-if="
                                            turno.estado === 'Atendido' ||
                                            turno.estado === 'Cancelado'
                                        "
                                        class="no-action"
                                    >
                                        —
                                    </span>
                                </div>
                            </td>
                        </tr>

                        <tr v-if="turnosFiltrados.length === 0">
                            <td colspan="7" class="empty-state">
                                <strong>No se encontraron turnos</strong>
                                <p>Probá modificando la fecha o los filtros de búsqueda.</p>
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
                        <h2>Reservar nuevo turno</h2>
                        <p>Completá los datos para registrar una nueva reserva.</p>
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

                <form class="turno-form" @submit.prevent="registrarTurno">
                    <div class="form-grid">
                        <label>
                            Paciente
                            <select v-model.number="nuevoTurno.idPaciente" required>
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
                            <select
                                v-model.number="nuevoTurno.idMedico"
                                required
                                @change="actualizarHorarioDisponible"
                            >
                                <option
                                    v-for="medico in medicos"
                                    :key="medico.id"
                                    :value="medico.id"
                                >
                                    {{ medico.apellido }}, {{ medico.nombre }}
                                </option>
                            </select>
                        </label>

                        <label>
                            Fecha del turno
                            <input
                                v-model="nuevoTurno.fecha"
                                type="date"
                                :min="fechaHoy"
                                required
                                @change="actualizarHorarioDisponible"
                            />
                        </label>

                        <label>
                            Horario disponible
                            <select v-model="nuevoTurno.horaInicio" required>
                                <option value="" disabled>Seleccionar horario</option>
                                <option
                                    v-for="horario in horariosDisponibles"
                                    :key="horario"
                                    :value="horario"
                                >
                                    {{ horario }} — {{ convertirMinutosAHora(convertirHoraAMinutos(horario) + 30) }}
                                </option>
                            </select>
                        </label>

                        <label class="full-width">
                            Costo del turno ($)
                            <input
                                v-model.number="nuevoTurno.costo"
                                type="number"
                                min="0"
                                step="1"
                                required
                            />
                        </label>
                    </div>

                    <div
                        v-if="horariosDisponibles.length === 0"
                        class="availability-warning"
                    >
                        No hay horarios disponibles para este médico y fecha.
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

                        <button
                            type="submit"
                            class="btn-primary"
                            :disabled="registrando || horariosDisponibles.length === 0"
                        >
                            {{ registrando ? "Registrando..." : "Registrar turno" }}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    </section>
</template>

<style scoped>
.turnos-view {
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
.section-heading p {
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

.btn-primary:hover:not(:disabled) {
    background: #066da9;
}

.btn-primary:disabled {
    cursor: not-allowed;
    opacity: 0.5;
}

.btn-primary span {
    font-size: 18px;
}

.feedback {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-top: 18px;
    padding: 12px 15px;
    border-radius: 8px;
    font-size: 13px;
    color: #526174;
    background: #edf4fa;
}

.feedback.success {
    color: #18764f;
    background: #e9f7f0;
}

.feedback.success button {
    border: none;
    background: transparent;
    color: inherit;
    font-size: 19px;
}

.feedback.error {
    color: #b42318;
    background: #fff0ee;
}

.retry-button {
    flex-shrink: 0;
    padding: 6px 10px;
    border: 1px solid #e3c4c0;
    border-radius: 6px;
    background: white;
    color: #b42318;
    font-size: 11px;
    font-weight: 600;
}

.summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
    margin: 27px 0;
}

.summary-card {
    display: flex;
    align-items: center;
    gap: 13px;
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
    flex-shrink: 0;
    border-radius: 10px;
    font-size: 21px;
    font-weight: 600;
}

.summary-icon.blue {
    color: #087fc4;
    background: #e8f4fc;
}

.summary-icon.orange {
    color: #d58a25;
    background: #fff4e4;
}

.summary-icon.green {
    color: #21966a;
    background: #e8f7f0;
}

.summary-icon.red {
    color: #c34e4e;
    background: #fdeeee;
}

.summary-card span,
.summary-card small {
    display: block;
    color: #8491a1;
    font-size: 11px;
}

.summary-card strong {
    display: block;
    margin: 5px 0;
    color: #263445;
    font-size: 24px;
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

.filters {
    display: grid;
    grid-template-columns: 180px minmax(200px, 1fr) 200px;
    gap: 13px;
    margin-bottom: 18px;
}

.filter-group {
    display: flex;
    flex-direction: column;
    gap: 7px;
}

.filter-group span {
    color: #536174;
    font-size: 11px;
    font-weight: 600;
}

.filter-group input,
.filter-group select {
    width: 100%;
    box-sizing: border-box;
    min-height: 40px;
    padding: 0 11px;
    border: 1px solid #e1e7ef;
    border-radius: 8px;
    outline-color: #087fc4;
    background: white;
    color: #344255;
    font-size: 12px;
}

.date-caption {
    margin-bottom: 12px;
    color: #8491a1;
    font-size: 12px;
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
    padding: 13px 11px;
    background: #f8fafc;
    color: #8491a1;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    white-space: nowrap;
}

td {
    padding: 15px 11px;
    border-bottom: 1px solid #edf1f5;
    color: #536174;
    font-size: 12px;
    white-space: nowrap;
}

tbody tr:last-child td {
    border-bottom: none;
}

.time-cell strong,
.time-cell small {
    display: block;
}

.time-cell strong,
.patient-name {
    color: #344255;
    font-size: 12px;
}

.time-cell small {
    margin-top: 4px;
    color: #8491a1;
    font-size: 10px;
}

.status-badge {
    display: inline-block;
    padding: 6px 9px;
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

.actions {
    display: flex;
    align-items: center;
    gap: 7px;
}

.action-button {
    padding: 6px 9px;
    border: none;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 600;
}

.confirm-action {
    color: #1975ad;
    background: #eaf5fc;
}

.cancel-action {
    color: #b74747;
    background: #fdeeee;
}

.no-action {
    color: #a0aab6;
}

.empty-state {
    padding: 35px;
    text-align: center;
    white-space: normal;
}

.empty-state strong {
    display: block;
    margin-bottom: 6px;
    color: #536174;
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
    width: min(600px, 100%);
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

.modal-header p {
    margin: 0;
    color: #8491a1;
    font-size: 13px;
}

.close-button {
    border: none;
    background: transparent;
    color: #8491a1;
    font-size: 26px;
}

.form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 17px;
}

.turno-form label {
    display: flex;
    flex-direction: column;
    gap: 7px;
    color: #526174;
    font-size: 12px;
    font-weight: 600;
}

.turno-form input,
.turno-form select {
    width: 100%;
    box-sizing: border-box;
    min-height: 40px;
    padding: 9px 11px;
    border: 1px solid #e1e7ef;
    border-radius: 8px;
    outline-color: #087fc4;
    background: white;
    color: #344255;
    font-size: 12px;
}

.full-width {
    grid-column: 1 / -1;
}

.availability-warning {
    margin-top: 17px;
    padding: 12px;
    border-radius: 8px;
    background: #fff5e5;
    color: #99651d;
    font-size: 12px;
}

.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 25px;
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

@media (max-width: 1100px) {
    .summary-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 800px) {
    .filters {
        grid-template-columns: 1fr 1fr;
    }

    .search-filter {
        grid-column: 1 / -1;
        grid-row: 1;
    }
}

@media (max-width: 600px) {
    .turnos-view {
        padding: 20px 15px;
    }

    .page-header {
        align-items: flex-start;
        flex-direction: column;
    }

    .summary-grid {
        grid-template-columns: 1fr;
    }

    .filters,
    .form-grid {
        grid-template-columns: 1fr;
    }

    .search-filter,
    .full-width {
        grid-column: auto;
    }

    .content-card {
        padding: 15px;
    }

    .modal {
        padding: 20px;
    }
}
</style>
