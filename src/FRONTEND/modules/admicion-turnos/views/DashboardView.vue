
<script setup lang="ts">

import { computed } from "vue";


// Fecha actual
const fechaActual = computed(() => {

    return new Intl.DateTimeFormat("es-AR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    }).format(new Date());

});


// Navegación hacia otras vistas
type Destino =
    | "turnos"
    | "agenda"
    | "pacientes"
    | "triaje"
    | "lista-espera";

const emit = defineEmits<{
    (event: "navegar", destino: Destino): void;
}>();


// Datos de prueba: resumen general
const indicadores = [
    {
        titulo: "Turnos de hoy",
        valor: 24,
        detalle: "Total de citas programadas",
        icono: "▦",
        color: "blue"
    },
    {
        titulo: "Confirmados",
        valor: 18,
        detalle: "Pacientes que confirmaron",
        icono: "✓",
        color: "green"
    },
    {
        titulo: "En sala de espera",
        valor: 4,
        detalle: "Pacientes esperando atención",
        icono: "◷",
        color: "orange"
    },
    {
        titulo: "Cancelados",
        valor: 2,
        detalle: "Turnos anulados hoy",
        icono: "×",
        color: "red"
    }
];


// Datos de prueba: próximos turnos
const proximosTurnos = [
    {
        hora: "10:00",
        paciente: "Carlos López",
        dni: "34.567.890",
        medico: "Dr. Silva",
        estado: "Confirmado",
        clase: "confirmado"
    },
    {
        hora: "10:30",
        paciente: "María González",
        dni: "29.456.789",
        medico: "Dra. Fernández",
        estado: "Programado",
        clase: "programado"
    },
    {
        hora: "11:00",
        paciente: "Juan Gómez",
        dni: "37.123.456",
        medico: "Dr. Silva",
        estado: "En sala de espera",
        clase: "espera"
    },
    {
        hora: "11:30",
        paciente: "Lucía Martínez",
        dni: "32.789.456",
        medico: "Dra. Fernández",
        estado: "Confirmado",
        clase: "confirmado"
    }
];


// Datos de prueba: pacientes en lista de espera
const pacientesEnEspera = [
    {
        nombre: "Luis Medina",
        medico: "Dr. Silva",
        fecha: "Hoy",
        posicion: 1
    },
    {
        nombre: "Pedro Ramírez",
        medico: "Dr. Silva",
        fecha: "Hoy",
        posicion: 2
    },
    {
        nombre: "Sofía Torres",
        medico: "Dra. Fernández",
        fecha: "Mañana",
        posicion: 1
    }
];


// Datos de prueba: triaje
const alertasTriaje = [
    {
        paciente: "Paciente de guardia",
        nivel: "ROJO",
        descripcion: "Riesgo vital - Atención inmediata",
        hora: "10:15"
    },
    {
        paciente: "Paciente de guardia",
        nivel: "AMARILLO",
        descripcion: "Urgencia intermedia",
        hora: "10:20"
    }
];


// Navegar hacia otra vista
function navegar(destino: Destino) {

    emit("navegar", destino);

}

</script>


<template>

    <main class="dashboard">

        <!-- ENCABEZADO -->

        <header class="dashboard-header">

            <div class="header-info">

                <span class="eyebrow">
                    ADMISIÓN / FRONT DESK
                </span>

                <h1>Panel de admisión</h1>

                <p>
                    Bienvenido. Este es el resumen general de actividad del hospital.
                </p>

                <span class="fecha-actual">
                    {{ fechaActual }}
                </span>

            </div>


            <div class="header-actions">

                <button
                    class="button-secondary"
                    @click="navegar('agenda')"
                >
                    Ver agenda
                </button>

                <button
                    class="button-primary"
                    @click="navegar('turnos')"
                >
                    + Nuevo turno
                </button>

            </div>

        </header>


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
                    {{ indicador.valor }}
                </strong>

                <span class="indicator-detail">
                    {{ indicador.detalle }}
                </span>

            </article>

        </section>


        <!-- CONTENIDO PRINCIPAL -->

        <section class="dashboard-content">


            <!-- PRÓXIMOS TURNOS -->

            <article class="panel appointments-panel">

                <div class="panel-header">

                    <div>
                        <h2>Próximos turnos</h2>

                        <p>
                            Agenda médica del día
                        </p>
                    </div>

                    <button
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
                                :key="turno.dni"
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

                                <td>
                                    {{ turno.medico }}
                                </td>

                                <td>

                                    <span
                                        class="status-badge"
                                        :class="`status-${turno.clase}`"
                                    >
                                        {{ turno.estado }}
                                    </span>

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

                            <p>
                                Pacientes pendientes
                            </p>
                        </div>

                        <button
                            class="text-button"
                            @click="navegar('lista-espera')"
                        >
                            Ver →
                        </button>

                    </div>


                    <div class="waiting-list">

                        <div
                            v-for="paciente in pacientesEnEspera"
                            :key="paciente.nombre"
                            class="waiting-item"
                        >

                            <div class="waiting-number">
                                {{ paciente.posicion }}
                            </div>

                            <div class="waiting-info">

                                <strong>
                                    {{ paciente.nombre }}
                                </strong>

                                <span>
                                    {{ paciente.medico }}
                                    · {{ paciente.fecha }}
                                </span>

                            </div>

                        </div>

                    </div>

                </article>


                <!-- ALERTAS DE TRIAJE -->

                <article class="panel triage-panel">

                    <div class="panel-header">

                        <div>
                            <h2>Triaje de guardia</h2>

                            <p>
                                Clasificaciones pendientes
                            </p>
                        </div>

                        <button
                            class="text-button"
                            @click="navegar('triaje')"
                        >
                            Ver →
                        </button>

                    </div>


                    <div
                        v-for="(alerta, index) in alertasTriaje"
                        :key="index"
                        class="triage-alert"
                        :class="`triage-${alerta.nivel.toLowerCase()}`"
                    >

                        <div class="triage-alert-top">

                            <strong>
                                {{ alerta.nivel }}
                            </strong>

                            <span>
                                {{ alerta.hora }}
                            </span>

                        </div>

                        <p>
                            {{ alerta.descripcion }}
                        </p>

                    </div>

                </article>

            </div>

        </section>


        <!-- ACCESOS RÁPIDOS -->

        <section class="quick-actions">

            <h2>Accesos rápidos</h2>

            <div class="quick-actions-grid">

                <button
                    class="quick-action"
                    @click="navegar('pacientes')"
                >
                    <span>♙</span>
                    <strong>Registrar paciente</strong>
                    <small>Incorporar un nuevo paciente</small>
                </button>


                <button
                    class="quick-action"
                    @click="navegar('turnos')"
                >
                    <span>▦</span>
                    <strong>Reservar turno</strong>
                    <small>Asignar una cita médica</small>
                </button>


                <button
                    class="quick-action"
                    @click="navegar('agenda')"
                >
                    <span>◷</span>
                    <strong>Consultar agenda</strong>
                    <small>Revisar horarios médicos</small>
                </button>


                <button
                    class="quick-action"
                    @click="navegar('triaje')"
                >
                    <span>♡</span>
                    <strong>Ingresar a guardia</strong>
                    <small>Registrar un paciente urgente</small>
                </button>

            </div>

        </section>


        <div class="demo-notice">
            Los datos mostrados son ilustrativos. La información real se obtendrá de la API del hospital.
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

.header-actions {
    display: flex;
    gap: 10px;
}

button {
    font-family: inherit;
    cursor: pointer;
}

.button-primary,
.button-secondary {
    padding: 11px 17px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    transition: 0.2s;
}

.button-primary {
    background: #2563eb;
    color: white;
    border: 1px solid #2563eb;
}

.button-primary:hover {
    background: #1d4ed8;
}

.button-secondary {
    background: white;
    border: 1px solid #e2e8f0;
    color: #334155;
}

.button-secondary:hover {
    background: #f8fafc;
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
}

.waiting-info strong {
    font-size: 12px;
    color: #334155;
}

.waiting-info span {
    font-size: 11px;
    color: #94a3b8;
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

.triage-alert-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.triage-alert-top strong {
    font-size: 11px;
    font-weight: 800;
}

.triage-rojo strong {
    color: #dc2626;
}

.triage-amarillo strong {
    color: #b45309;
}

.triage-alert-top span {
    color: #94a3b8;
    font-size: 10px;
}

.triage-alert p {
    font-size: 11px;
    color: #64748b;
    margin: 5px 0 0;
}


/* ACCESOS RÁPIDOS */

.quick-actions {
    margin-top: 25px;
}

.quick-actions h2 {
    font-size: 16px;
    margin-bottom: 15px;
}

.quick-actions-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 15px;
}

.quick-action {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
    gap: 9px;
    padding: 18px;
    background: white;
    border: 1px solid #e8edf3;
    border-radius: 12px;
    transition: 0.2s;
}

.quick-action:hover {
    border-color: #93c5fd;
    transform: translateY(-2px);
}

.quick-action > span {
    font-size: 22px;
    color: #2563eb;
}

.quick-action strong {
    font-size: 12px;
    color: #334155;
}

.quick-action small {
    color: #94a3b8;
    font-size: 11px;
}


/* AVISO DE DATOS DE PRUEBA */

.demo-notice {
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

    .quick-actions-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

}


@media (max-width: 600px) {

    .dashboard {
        padding: 18px;
    }

    .dashboard-header {
        flex-direction: column;
    }

    .header-actions {
        width: 100%;
    }

    .header-actions button {
        flex: 1;
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

    .quick-actions-grid {
        grid-template-columns: 1fr 1fr;
        gap: 10px;
    }

}

</style>
