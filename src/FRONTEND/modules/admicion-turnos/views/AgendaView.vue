
<script setup lang="ts">
import { computed, ref } from "vue";

interface Medico {
    id: number;
    nombre: string;
    especialidad: string;
}

interface TurnoAgenda {
    id: number;
    idMedico: number;
    fecha: string;
    horaInicio: string;
    horaFin: string;
    paciente: string;
    dni: string;
    motivo: string;
    estado: "Programado" | "Confirmado" | "En Sala de Espera" | "Atendido" | "Cancelado";
}

interface IntervaloDisponible {
    inicio: string;
    fin: string;
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

function sumarMinutos(hora: string, minutos: number): string {
    const total = convertirHoraAMinutos(hora) + minutos;

    const nuevaHora = Math.floor(total / 60);
    const nuevosMinutos = total % 60;

    return `${String(nuevaHora).padStart(2, "0")}:${String(nuevosMinutos).padStart(2, "0")}`;
}

const fechaHoy = obtenerFechaLocal(new Date());

const medicos = ref<Medico[]>([
    {
        id: 1,
        nombre: "Dr. Silva",
        especialidad: "Cardiología"
    },
    {
        id: 2,
        nombre: "Dra. Torres",
        especialidad: "Pediatría"
    },
    {
        id: 3,
        nombre: "Dr. Pérez",
        especialidad: "Clínica médica"
    }
]);

const turnos = ref<TurnoAgenda[]>([
    {
        id: 1,
        idMedico: 1,
        fecha: fechaHoy,
        horaInicio: "08:00",
        horaFin: "08:30",
        paciente: "Carlos López",
        dni: "35678901",
        motivo: "Control cardiológico",
        estado: "Confirmado"
    },
    {
        id: 2,
        idMedico: 1,
        fecha: fechaHoy,
        horaInicio: "09:00",
        horaFin: "09:30",
        paciente: "Lucía Fernández",
        dni: "42156890",
        motivo: "Electrocardiograma",
        estado: "Programado"
    },
    {
        id: 3,
        idMedico: 1,
        fecha: fechaHoy,
        horaInicio: "10:00",
        horaFin: "10:30",
        paciente: "Martín Rodríguez",
        dni: "33214567",
        motivo: "Consulta general",
        estado: "Confirmado"
    },
    {
        id: 4,
        idMedico: 1,
        fecha: fechaHoy,
        horaInicio: "10:30",
        horaFin: "11:00",
        paciente: "Mariana Gómez",
        dni: "39876543",
        motivo: "Control periódico",
        estado: "En Sala de Espera"
    },
    {
        id: 5,
        idMedico: 1,
        fecha: fechaHoy,
        horaInicio: "12:00",
        horaFin: "12:30",
        paciente: "Pedro Sánchez",
        dni: "34567890",
        motivo: "Primera consulta",
        estado: "Cancelado"
    },
    {
        id: 6,
        idMedico: 2,
        fecha: fechaHoy,
        horaInicio: "08:00",
        horaFin: "08:30",
        paciente: "Sofía Ramírez",
        dni: "44567890",
        motivo: "Control pediátrico",
        estado: "Confirmado"
    },
    {
        id: 7,
        idMedico: 2,
        fecha: fechaHoy,
        horaInicio: "09:00",
        horaFin: "09:30",
        paciente: "Mateo González",
        dni: "45678901",
        motivo: "Consulta general",
        estado: "Programado"
    },
    {
        id: 8,
        idMedico: 3,
        fecha: fechaHoy,
        horaInicio: "08:30",
        horaFin: "09:00",
        paciente: "Ana Martínez",
        dni: "36789012",
        motivo: "Consulta clínica",
        estado: "Confirmado"
    }
]);

const medicoSeleccionado = ref(1);
const fechaSeleccionada = ref(fechaHoy);

const medicoActual = computed(() =>
    medicos.value.find((medico) => medico.id === medicoSeleccionado.value)
);

const turnosDelDia = computed(() => {
    return turnos.value
        .filter(
            (turno) =>
                turno.idMedico === medicoSeleccionado.value &&
                turno.fecha === fechaSeleccionada.value
        )
        .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
});

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

const intervalosDisponibles = computed<IntervaloDisponible[]>(() => {
    const intervalos: IntervaloDisponible[] = [];

    // Horario de atención de ejemplo: de 08:00 a 17:00.
    for (let minutos = 8 * 60; minutos < 17 * 60; minutos += 30) {
        const horaInicio = `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;
        const horaFin = sumarMinutos(horaInicio, 30);

        const estaOcupado = turnosActivos.value.some(
            (turno) =>
                turno.horaInicio < horaFin &&
                turno.horaFin > horaInicio
        );

        if (estaOcupado) continue;

        const ultimoIntervalo = intervalos[intervalos.length - 1];

        if (ultimoIntervalo && ultimoIntervalo.fin === horaInicio) {
            ultimoIntervalo.fin = horaFin;
        } else {
            intervalos.push({
                inicio: horaInicio,
                fin: horaFin
            });
        }
    }

    return intervalos;
});

const duracionOcupada = computed(() =>
    turnosActivos.value.reduce((total, turno) => {
        const inicio = convertirHoraAMinutos(turno.horaInicio);
        const fin = convertirHoraAMinutos(turno.horaFin);

        return total + (fin - inicio);
    }, 0)
);

function cambiarDia(cantidad: number) {
    const fecha = new Date(`${fechaSeleccionada.value}T12:00:00`);
    fecha.setDate(fecha.getDate() + cantidad);
    fechaSeleccionada.value = obtenerFechaLocal(fecha);
}

function formatoFecha(fecha: string): string {
    if (!fecha) return "";

    const [anio, mes, dia] = fecha.split("-");
    return `${dia}/${mes}/${anio}`;
}

function obtenerEstadoClase(estado: TurnoAgenda["estado"]): string {
    const clases: Record<TurnoAgenda["estado"], string> = {
        Programado: "programado",
        Confirmado: "confirmado",
        "En Sala de Espera": "en-espera",
        Atendido: "atendido",
        Cancelado: "cancelado"
    };

    return clases[estado];
}
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
                <select id="medico" v-model.number="medicoSeleccionado">
                    <option
                        v-for="medico in medicos"
                        :key="medico.id"
                        :value="medico.id"
                    >
                        {{ medico.nombre }} — {{ medico.especialidad }}
                    </option>
                </select>
            </div>

            <div class="filter-group date-filter">
                <label for="fecha">Fecha de consulta</label>
                <div class="date-controls">
                    <button type="button" @click="cambiarDia(-1)" aria-label="Día anterior">
                        ‹
                    </button>
                    <input id="fecha" v-model="fechaSeleccionada" type="date" />
                    <button type="button" @click="cambiarDia(1)" aria-label="Día siguiente">
                        ›
                    </button>
                </div>
            </div>

            <button
                type="button"
                class="today-button"
                @click="fechaSeleccionada = fechaHoy"
            >
                Hoy
            </button>
        </section>

        <section class="doctor-heading">
            <div class="doctor-avatar">MD</div>
            <div>
                <h2>{{ medicoActual?.nombre }}</h2>
                <p>{{ medicoActual?.especialidad }} · {{ formatoFecha(fechaSeleccionada) }}</p>
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
                    <small>Pacientes con asistencia confirmada o en sala</small>
                </div>
            </article>

            <article class="summary-card">
                <div class="summary-icon orange">◷</div>
                <div>
                    <span>Tiempo ocupado</span>
                    <strong>{{ duracionOcupada }} min</strong>
                    <small>Sobre el horario de atención</small>
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

                <div v-if="turnosDelDia.length > 0" class="appointments-list">
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
                            <span>DNI {{ turno.dni }} · {{ turno.motivo }}</span>
                        </div>

                        <div class="appointment-duration">
                            {{ (
                                (Number(turno.horaFin.slice(0, 2)) * 60 +
                                    Number(turno.horaFin.slice(3, 5))) -
                                (Number(turno.horaInicio.slice(0, 2)) * 60 +
                                    Number(turno.horaInicio.slice(3, 5)))
                            ) }} min
                        </div>

                        <span class="status-badge" :class="obtenerEstadoClase(turno.estado)">
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

                <div v-if="intervalosDisponibles.length > 0" class="availability-list">
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
                    <p>No se encontraron horarios libres en la jornada configurada.</p>
                </div>

                <div class="availability-note">
                    <strong>Horario de atención</strong>
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
