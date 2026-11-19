
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import EnfermeriaNav from '../components/EnfermeriaNav.vue';

interface Paciente {
    id: number;
    nombre: string;
    apellido: string;
    habitacion: number;
    piso: number;
}

interface Tarea {
    id: number;
    descripcion: string;
    estado: 'Pendiente' | 'Completada';
}

interface Protocolo {
    id: number;
    id_paciente: number;
    tipo_protocolo: string;
    fecha_generacion: string;
    tareas: Tarea[];
}

const pacientes = ref<Paciente[]>([]);
const protocolos = ref<Protocolo[]>([]);
const paciente_seleccionado = ref('');
const motivo_ingreso = ref<'Prequirurgico' | 'Neumonia'>('Prequirurgico');

const cargando = ref(false);
const generando = ref(false);
const actualizando = ref<number | null>(null);

const mensaje = ref('');
const error = ref('');

async function cargar_pacientes() {
    try {
        const respuesta = await fetch('/api/pacientes-internados', {
            credentials: 'include'
        });

        if (!respuesta.ok) {
            throw new Error('No se pudieron cargar los pacientes internados.');
        }

        pacientes.value = await respuesta.json() as Paciente[];
    } catch (e) {
        error.value = e instanceof Error
            ? e.message
            : 'Error al cargar pacientes.';
    }
}

async function cargar_protocolos() {
    if (!paciente_seleccionado.value) {
        protocolos.value = [];
        return;
    }

    cargando.value = true;
    error.value = '';
    mensaje.value = '';

    try {
        const respuesta = await fetch(
            `/api/protocolos/paciente/${paciente_seleccionado.value}`,
            { credentials: 'include' }
        );

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(
                resultado.mensaje || 'No se pudieron cargar los protocolos.'
            );
        }

        protocolos.value = resultado.protocolos;
    } catch (e) {
        error.value = e instanceof Error
            ? e.message
            : 'Error al cargar protocolos.';
    } finally {
        cargando.value = false;
    }
}

async function generar_protocolo() {
    if (!paciente_seleccionado.value) {
        error.value = 'Seleccioná un paciente.';
        return;
    }

    generando.value = true;
    error.value = '';
    mensaje.value = '';

    try {
        const respuesta = await fetch('/api/protocolos', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id_paciente: Number(paciente_seleccionado.value),
                motivo_ingreso: motivo_ingreso.value
            })
        });

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(
                resultado.mensaje || 'No se pudo generar el protocolo.'
            );
        }

        await cargar_protocolos();

        if (!error.value) {
            mensaje.value = 'Protocolo generado correctamente.';
        }
    } catch (e) {
        error.value = e instanceof Error
            ? e.message
            : 'Error al generar el protocolo.';
    } finally {
        generando.value = false;
    }
}

async function actualizar_tarea(tarea: Tarea) {
    actualizando.value = tarea.id;
    error.value = '';
    mensaje.value = '';

    const nuevo_estado = tarea.estado === 'Pendiente'
        ? 'Completada'
        : 'Pendiente';

    try {
        const respuesta = await fetch(
            `/api/protocolos/tareas/${tarea.id}`,
            {
                method: 'PATCH',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ estado: nuevo_estado })
            }
        );

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(
                resultado.mensaje || 'No se pudo actualizar la tarea.'
            );
        }

        tarea.estado = nuevo_estado;
        mensaje.value = 'Estado de la tarea actualizado correctamente.';
    } catch (e) {
        error.value = e instanceof Error
            ? e.message
            : 'Error al actualizar la tarea.';
    } finally {
        actualizando.value = null;
    }
}

function nombre_protocolo(tipo: string): string {
    if (tipo === 'Prequirurgico') return 'Protocolo prequirúrgico';
    if (tipo === 'Respiratorio') return 'Protocolo respiratorio';
    return tipo;
}

function fecha_formateada(fecha: string): string {
    const valor = new Date(fecha);

    if (Number.isNaN(valor.getTime())) {
        return 'Fecha no disponible';
    }

    return valor.toLocaleString('es-AR');
}

onMounted(cargar_pacientes);
</script>

<template>
    <EnfermeriaNav />

    <main class="protocolos-page">
        <header class="page-header">
            <span class="eyebrow">ATENCIÓN Y ENFERMERÍA</span>
            <h1>Protocolos de atención</h1>
            <p>Consultá las indicaciones y el estado de las tareas de cada paciente.</p>
        </header>

        <section class="selector-section">
            <label for="paciente">Seleccionar paciente internado</label>

            <select
                id="paciente"
                v-model="paciente_seleccionado"
                @change="cargar_protocolos"
            >
                <option value="">Seleccioná un paciente</option>
                <option
                    v-for="paciente in pacientes"
                    :key="paciente.id"
                    :value="String(paciente.id)"
                >
                    {{ paciente.nombre }} {{ paciente.apellido }}
                    — Habitación {{ paciente.habitacion }}
                </option>
            </select>
        </section>

        <section class="selector-section">
            <label for="motivo">Motivo de ingreso</label>

            <select
                id="motivo"
                v-model="motivo_ingreso"
            >
                <option value="Prequirurgico">Prequirúrgico</option>
                <option value="Neumonia">Neumonía</option>
            </select>

            <button
                type="button"
                class="generate-button"
                :disabled="!paciente_seleccionado || generando"
                @click="generar_protocolo"
            >
                {{ generando ? 'Generando...' : 'Generar protocolo' }}
            </button>
        </section>

        <div v-if="error" class="message error" role="alert">
            {{ error }}
        </div>

        <div v-if="mensaje" class="message success" role="status">
            {{ mensaje }}
        </div>

        <div v-if="cargando" class="empty-state">
            Cargando protocolos...
        </div>

        <div
            v-else-if="!paciente_seleccionado"
            class="empty-state"
        >
            Seleccioná un paciente para consultar sus protocolos.
        </div>

        <div
            v-else-if="protocolos.length === 0"
            class="empty-state"
        >
            Este paciente todavía no tiene protocolos generados.
        </div>

        <section v-else class="protocolos-list">
            <article
                v-for="protocolo in protocolos"
                :key="protocolo.id"
                class="protocol-card"
            >
                <header class="protocol-header">
                    <div>
                        <span class="protocol-label">PROTOCOLO</span>
                        <h2>{{ nombre_protocolo(protocolo.tipo_protocolo) }}</h2>
                        <p>Generado: {{ fecha_formateada(protocolo.fecha_generacion) }}</p>
                    </div>

                    <span class="protocol-count">
                        {{ protocolo.tareas.length }} tareas
                    </span>
                </header>

                <div class="tasks-list">
                    <div
                        v-for="tarea in protocolo.tareas"
                        :key="tarea.id"
                        class="task"
                    >
                        <div class="task-info">
                            <strong>{{ tarea.descripcion }}</strong>

                            <span
                                class="task-status"
                                :class="tarea.estado === 'Completada' ? 'completed' : 'pending'"
                            >
                                {{ tarea.estado }}
                            </span>
                        </div>

                        <button
                            type="button"
                            class="task-button"
                            :disabled="actualizando === tarea.id"
                            @click="actualizar_tarea(tarea)"
                        >
                            {{ actualizando === tarea.id
                                ? 'Actualizando...'
                                : tarea.estado === 'Pendiente'
                                    ? 'Marcar completada'
                                    : 'Marcar pendiente'
                            }}
                        </button>
                    </div>
                </div>
            </article>
        </section>
    </main>
</template>

<style scoped>
.protocolos-page {
    max-width: 1100px;
    margin: 0 auto;
    padding: 36px 42px;
    color: #24384b;
}

.page-header {
    margin-bottom: 30px;
}

.eyebrow,
.protocol-label {
    color: #087fc4;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1px;
}

.page-header h1 {
    margin: 8px 0;
    font-size: 28px;
}

.page-header p,
.protocol-header p {
    color: #718398;
    font-size: 13px;
}

.selector-section {
    display: flex;
    flex-direction: column;
    gap: 9px;
    max-width: 480px;
    margin-bottom: 24px;
}

.selector-section label {
    font-size: 13px;
    font-weight: 600;
}

.selector-section select {
    padding: 12px;
    border: 1px solid #dce5ed;
    border-radius: 8px;
    background: white;
    color: #24384b;
}

.generate-button {
    padding: 12px 16px;
    border: none;
    border-radius: 8px;
    background: #087fc4;
    color: white;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
}

.generate-button:hover:not(:disabled) {
    background: #066ba5;
}

.generate-button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
}

.empty-state,
.message {
    padding: 20px;
    border-radius: 9px;
    background: #f5f8fb;
    color: #718398;
    font-size: 13px;
}

.message {
    margin-bottom: 18px;
}

.error {
    background: #fff0f0;
    color: #b42318;
}

.success {
    background: #eaf8ef;
    color: #247344;
}

.protocolos-list {
    display: grid;
    gap: 20px;
}

.protocol-card {
    overflow: hidden;
    border: 1px solid #e3eaf0;
    border-radius: 12px;
    background: white;
}

.protocol-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 22px;
    border-bottom: 1px solid #e9eef3;
}

.protocol-header h2 {
    margin: 7px 0;
    font-size: 19px;
}

.protocol-header p {
    margin: 0;
}

.protocol-count {
    padding: 7px 11px;
    border-radius: 20px;
    background: #e5f5ff;
    color: #087fc4;
    font-size: 12px;
    white-space: nowrap;
}

.tasks-list {
    padding: 0 22px;
}

.task {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 17px 0;
    border-bottom: 1px solid #edf1f5;
}

.task:last-child {
    border-bottom: none;
}

.task-info {
    display: flex;
    flex-direction: column;
    gap: 7px;
}

.task-info strong {
    font-size: 13px;
    font-weight: 500;
}

.task-status {
    width: fit-content;
    padding: 4px 8px;
    border-radius: 15px;
    font-size: 11px;
}

.pending {
    background: #fff5df;
    color: #9a6700;
}

.completed {
    background: #e8f7ee;
    color: #247344;
}

.task-button {
    padding: 9px 12px;
    border: 1px solid #cbdde9;
    border-radius: 7px;
    background: white;
    color: #087fc4;
    font-size: 11px;
    cursor: pointer;
    white-space: nowrap;
}

.task-button:disabled {
    cursor: wait;
    opacity: 0.6;
}

@media (max-width: 650px) {
    .protocolos-page {
        padding: 24px 16px;
    }

    .task {
        align-items: flex-start;
        flex-direction: column;
    }

    .protocol-header {
        align-items: flex-start;
        flex-direction: column;
    }
}
</style>
