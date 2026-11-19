<script setup lang="ts">
import { onMounted, ref } from "vue";

interface PacienteDashboard {
    id: number;
    nombre: string;
    apellido: string;
    habitacion: number;
    temperatura: number | null;
    fecha_hora: string | null;
}

interface Alerta {
    id: number;
    paciente: string;
    habitacion: number;
    mensaje: string;
    hora: string;
}

const alertas = ref<Alerta[]>([]);
const cargando = ref(false);
const error = ref("");

function hora_control(fecha: string | null): string {
    if (!fecha) return "Hora no disponible";

    const valor = new Date(fecha);
    if (Number.isNaN(valor.getTime())) return "Hora no disponible";

    return valor.toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}

async function cargar_alertas(): Promise<void> {
    cargando.value = true;
    error.value = "";

    try {
        const respuesta = await fetch("/api/dashboard", {
            credentials: "include"
        });
        if (!respuesta.ok) {
            throw new Error("No se pudieron cargar las alertas del monitoreo.");
        }

        const pacientes = await respuesta.json() as PacienteDashboard[];
        alertas.value = pacientes
            .filter((paciente) => paciente.temperatura !== null && paciente.temperatura > 39)
            .map((paciente) => ({
                id: paciente.id,
                paciente: `${paciente.nombre} ${paciente.apellido}`,
                habitacion: paciente.habitacion,
                mensaje: `Temperatura registrada de ${paciente.temperatura} °C.`,
                hora: hora_control(paciente.fecha_hora)
            }));
    } catch (e) {
        error.value = e instanceof Error
            ? e.message
            : "Error al cargar las alertas.";
    } finally {
        cargando.value = false;
    }
}

onMounted(cargar_alertas);
</script>

<template>
    <div class="page">
        <RouterLink to="/enfermeria" class="back-button">
            Volver al panel
        </RouterLink>

        <header class="page-header">
            <div>
                <span class="section-label">MONITOREO</span>
                <h1>Alertas</h1>
                <p>Alertas generadas a partir de los últimos signos vitales de pacientes internados.</p>
            </div>

            <div class="alert-count">
                <strong>{{ alertas.length }}</strong>
                <span>temperaturas elevadas</span>
            </div>
        </header>

        <p v-if="cargando" class="empty">Cargando alertas...</p>
        <p v-else-if="error" class="message error" role="alert">{{ error }}</p>

        <section v-else-if="alertas.length > 0" class="alerts-list">
            <article
                v-for="alerta in alertas"
                :key="alerta.id"
                class="alert-card high"
            >
                <div class="alert-icon">!</div>

                <div class="alert-main">
                    <div class="alert-title">
                        <div>
                            <span class="priority">Prioridad Alta</span>
                            <h2>Temperatura elevada</h2>
                        </div>
                        <span class="time">{{ alerta.hora }}</span>
                    </div>

                    <div class="patient">
                        <strong>{{ alerta.paciente }}</strong>
                        <span>Habitación {{ alerta.habitacion }}</span>
                    </div>

                    <p>{{ alerta.mensaje }}</p>
                </div>
            </article>
        </section>

        <section v-else class="empty">
            <div class="empty-icon">✓</div>
            <h2>No se detectaron temperaturas elevadas</h2>
            <p>Los últimos controles disponibles no superan los 39 °C.</p>
        </section>

        <section class="alert-info">
            <strong>Temperaturas superiores a 39 °C</strong>
            <p>Se muestran para facilitar la revisión del equipo asistencial. La pantalla no reemplaza la valoración clínica ni registra la resolución de una alerta.</p>
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

.section-label {
color: #087fc4;
font-size: 10px;
font-weight: 700;
letter-spacing: 1.3px;
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

.alert-count {
display: flex;
flex-direction: column;
align-items: center;
padding: 13px 22px;
border: 1px solid #f0dada;
border-radius: 10px;
background: white;
}

.alert-count strong {
color: #d83b3b;
font-size: 23px;
}

.alert-count span {
color: #718496;
font-size: 11px;
}

.alerts-list {
display: flex;
flex-direction: column;
gap: 14px;
}

.alert-card {
display: flex;
align-items: center;
gap: 18px;
padding: 20px;
background: white;
border: 1px solid #f0dddd;
border-left: 4px solid #d99a28;
border-radius: 10px;
}

.alert-card.high {
border-left-color: #d83b3b;
}

.alert-icon {
width: 42px;
height: 42px;
flex-shrink: 0;
display: flex;
align-items: center;
justify-content: center;
border-radius: 50%;
background: #fff0f0;
color: #d83b3b;
font-size: 20px;
font-weight: 700;
}

.alert-main {
flex: 1;
}

.alert-title {
display: flex;
justify-content: space-between;
align-items: flex-start;
}

.priority {
color: #d83b3b;
font-size: 10px;
font-weight: 700;
text-transform: uppercase;
}

.alert-title h2 {
margin: 5px 0 8px;
color: #263f51;
font-size: 16px;
}

.time {
color: #8a99a6;
font-size: 11px;
}

.patient {
display: flex;
gap: 12px;
align-items: center;
}

.patient strong {
color: #263f51;
font-size: 12px;
}

.patient span {
color: #7d8d9b;
font-size: 11px;
}

.alert-main p {
margin: 10px 0 0;
color: #718496;
font-size: 12px;
}

.resolve-button {
padding: 9px 13px;
border: 1px solid #dce5eb;
border-radius: 7px;
background: white;
color: #526879;
font-size: 11px;
font-weight: 600;
cursor: pointer;
}

.resolve-button:hover {
border-color: #087fc4;
color: #087fc4;
}

.message {
padding: 16px;
border-radius: 9px;
font-size: 13px;
}

.message.error {
background: #fff0f0;
color: #b42318;
}

.empty {
padding: 60px 20px;
text-align: center;
background: white;
border: 1px solid #e5ebf1;
border-radius: 12px;
}

.empty-icon {
width: 50px;
height: 50px;
margin: 0 auto 15px;
display: flex;
align-items: center;
justify-content: center;
border-radius: 50%;
background: #e8f7ef;
color: #238452;
font-size: 24px;
font-weight: 700;
}

.empty h2 {
margin: 0 0 7px;
color: #263f51;
font-size: 18px;
}

.empty p {
margin: 0;
color: #8293a1;
font-size: 12px;
}

.alert-info {
margin-top: 22px;
padding: 16px;
border-radius: 9px;
background: #fff5f5;
}

.alert-info strong {
color: #c83b3b;
font-size: 12px;
}

.alert-info p {
margin: 5px 0 0;
color: #806464;
font-size: 11px;
line-height: 1.5;
}

@media (max-width: 800px) {
.page {
padding: 24px;
}

.alert-card {
align-items: flex-start;
flex-wrap: wrap;
}

.resolve-button {
margin-left: 60px;
}
}
</style>
