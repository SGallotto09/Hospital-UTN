
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

interface Paciente {
    id: number;
    nombre: string;
    apellido: string;
    dni: string;
    fecha_nacimiento: string;
    genero: string;
    telefono: string;
    email: string;
    obra_social: number;
}
interface Alergia {
    id: number;
    sustancia: string;
    reaccion: string;
    gravedad: string;
    estado: string;
    fecha_deteccion: string;
    fecha_registro: string;
    autor: string;
    id_alergia_anterior?: number | null;
    id_alergia_nueva?: number | null;
    motivo?: string | null;
    fecha_deteccion_calendario?: string;
}
interface Antecedente {
    id: number;
    parentesco: string;
    enfermedad: string;
    observaciones: string | null;
    fecha_registro: string;
    autor: string;
}
interface Evolucion {
    id: number;
    diagnostico: string;
    descripcion: string;
    fecha_registro: string;
    autor: string;
}
interface Estudio {
    id: number;
    tipo_estudio: string;
    descripcion: string | null;
    resultado: string | null;
    fecha_registro: string;
}
interface Historia {
    paciente: Paciente;
    alergias: Alergia[];
    antecedentesFamiliares: Antecedente[];
    evolucionesMedicas: Evolucion[];
    estudiosClinicos: Estudio[];
}
const pacientes = ref<Paciente[]>([]);
const buscador = ref('');
const pacienteSeleccionadoId = ref<number | null>(null);
const pacienteSeleccionado = computed(
    () => pacientes.value.find((p) => p.id === pacienteSeleccionadoId.value) ?? null,
);
const pacientesFiltrados = computed(() => {
    const texto = buscador.value.toLowerCase().trim();
    return pacientes.value.filter((p) =>
        (p.nombre + ' ' + p.apellido + ' ' + p.dni).toLowerCase().includes(texto),
    );
});
const alergiasPaciente = ref<Alergia[]>([]);
const antecedentesPaciente = ref<Antecedente[]>([]);
const evolucionesPaciente = ref<Evolucion[]>([]);
const estudiosPaciente = ref<Estudio[]>([]);
const puedeRegistrar = ref(false);
const cargandoPacientes = ref(true);
const cargandoHistoria = ref(false);
const historiaDisponible = ref(false);
const guardando = ref(false);
const error = ref('');
const mensaje = ref('');
let solicitud = 0;
const nuevaAlergia = ref({ sustancia: '', reaccion: '', gravedad: 'leve', fecha_deteccion: '' });
const rectificacion = ref<(typeof nuevaAlergia.value & {
    id: number;
    estado: string;
    motivo: string;
}) | null>(null);
const formularioAlergia = computed(() => rectificacion.value ?? nuevaAlergia.value);
const historialAlergiasDisponible = ref(false);
const errorHistorialAlergias = ref(false);
const alergiasActivas = computed(() =>
    alergiasPaciente.value.filter((a) => a.estado === 'activa' && !a.id_alergia_nueva),
);
const nuevoAntecedente = ref({ parentesco: '', condicion: '', observaciones: '' });
const nuevaEvolucion = ref({ diagnostico: '', descripcion: '' });

async function consultar(ruta: string, datos?: object) {
    const respuesta = await fetch('/api/historia-clinica' + ruta, {
        method: datos ? 'POST' : 'GET',
        credentials: 'same-origin',
        ...(datos
            ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) }
            : {}),
    });
    if (!respuesta.ok) {
        if (respuesta.status === 401)
            throw new Error('Debe iniciar sesion para consultar la historia clinica.');
        if (respuesta.status === 403)
            throw new Error('Su rol no tiene permisos para esta operacion.');
        const detalle = await respuesta.json().catch(() => ({}));
        throw new Error(detalle.mensaje || 'No se pudo completar la operacion.');
    }
    return respuesta.json();
}
function formatearFecha(valor: string) {
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? '-' : fecha.toLocaleDateString('es-AR');
}
function vaciarHistoria() {
    historiaDisponible.value = false;
    alergiasPaciente.value = [];
    rectificacion.value = null;
    historialAlergiasDisponible.value = false;
    errorHistorialAlergias.value = false;
    antecedentesPaciente.value = [];
    evolucionesPaciente.value = [];
    estudiosPaciente.value = [];
}
async function seleccionarPaciente(paciente: Paciente) {
    if (guardando.value) return;
    const actual = ++solicitud;
    pacienteSeleccionadoId.value = paciente.id;
    vaciarHistoria();
    error.value = '';
    mensaje.value = '';
    nuevaAlergia.value = { sustancia: '', reaccion: '', gravedad: 'leve', fecha_deteccion: '' };
    nuevoAntecedente.value = { parentesco: '', condicion: '', observaciones: '' };
    nuevaEvolucion.value = { diagnostico: '', descripcion: '' };
    cargandoHistoria.value = true;
    try {
        const historia: Historia = await consultar('/paciente/' + paciente.id);
        if (actual !== solicitud) return;
        alergiasPaciente.value = historia.alergias;
        antecedentesPaciente.value = historia.antecedentesFamiliares;
        evolucionesPaciente.value = historia.evolucionesMedicas;
        estudiosPaciente.value = historia.estudiosClinicos;
        historiaDisponible.value = true;
        void cargarHistorialAlergias(paciente.id, actual);
    } catch (fallo) {
        if (actual === solicitud)
            error.value =
                fallo instanceof Error ? fallo.message : 'No se pudo conectar con el servidor.';
    } finally {
        if (actual === solicitud) cargandoHistoria.value = false;
    }
}
async function cargarHistorialAlergias(idPaciente: number, actual: number) {
    try {
        const versiones: Alergia[] = await consultar(
            '/alergias/paciente/' + idPaciente + '/rectificaciones',
        );
        if (!Array.isArray(versiones)) throw new Error('Historial de alergias inválido.');
        if (actual !== solicitud) return;
        alergiasPaciente.value = versiones;
        historialAlergiasDisponible.value = true;
    } catch {
        if (actual === solicitud) errorHistorialAlergias.value = true;
    }
}
async function guardarRegistro(ruta: string, datos: object) {
    if (
        guardando.value ||
        cargandoHistoria.value ||
        !puedeRegistrar.value ||
        !pacienteSeleccionado.value
    )
        return;
    const paciente = pacienteSeleccionado.value;
    guardando.value = true;
    error.value = '';
    mensaje.value = '';
    try {
        await consultar(ruta, { ...datos, id_paciente: paciente.id });
        guardando.value = false;
        await seleccionarPaciente(paciente);
        mensaje.value = 'Registro guardado correctamente.';
    } catch (fallo) {
        error.value =
            fallo instanceof Error ? fallo.message : 'No se pudo conectar con el servidor.';
    } finally {
        guardando.value = false;
    }
}
function registrarAlergia() {
    if (rectificacion.value) {
        const { id, ...datos } = rectificacion.value;
        return guardarRegistro('/alergias/' + id + '/rectificaciones', datos);
    }
    return guardarRegistro('/alergias', nuevaAlergia.value);
}
function prepararRectificacion(alergia: Alergia) {
    rectificacion.value = {
        id: alergia.id,
        sustancia: alergia.sustancia,
        reaccion: alergia.reaccion,
        gravedad: alergia.gravedad,
        fecha_deteccion: alergia.fecha_deteccion_calendario ?? alergia.fecha_deteccion.slice(0, 10),
        estado: alergia.estado,
        motivo: '',
    };
}
function registrarAntecedente() {
    return guardarRegistro('/antecedentes', {
        parentesco: nuevoAntecedente.value.parentesco,
        enfermedad: nuevoAntecedente.value.condicion,
        observaciones: nuevoAntecedente.value.observaciones,
    });
}
function registrarEvolucion() {
    return guardarRegistro('/evoluciones', nuevaEvolucion.value);
}
onMounted(async () => {
    try {
        const sesion = await consultar('/sesion');
        puedeRegistrar.value = sesion.puedeRegistrar;
        pacientes.value = await consultar('/pacientes');
        if (pacientes.value[0]) await seleccionarPaciente(pacientes.value[0]);
    } catch (fallo) {
        error.value =
            fallo instanceof Error ? fallo.message : 'No se pudo conectar con el servidor.';
    } finally {
        cargandoPacientes.value = false;
    }
});
</script>

<template>
<div class="historia-clinica">

    <!-- CABECERA -->
    <header class="topbar">
        <div>
            <span class="breadcrumb">
                HISTORIA CLÍNICA ELECTRÓNICA
            </span>

            <h1>Historia clínica</h1>

            <p>
                Información médica centralizada de los pacientes.
            </p>
        </div>

        <div class="module-status">
            <span class="status-dot"></span>
            Sistema de historias clínicas
        </div>
    </header>

    <main class="content">
        <p v-if="error" role="alert" class="feedback-error">{{ error }}</p>
        <p v-if="mensaje" role="status">{{ mensaje }}</p>
        <p v-if="cargandoPacientes || cargandoHistoria" role="status">Cargando datos...</p>

        <!-- BUSCADOR Y SELECCIÓN -->
        <section class="section-header">
            <div>
                <span class="section-label">PACIENTES</span>
                <h2>Consultar historia clínica</h2>
                <p>
                    Buscá un paciente por nombre, apellido o DNI.
                </p>
            </div>
        </section>

        <section class="search-layout">

            <div class="search-panel">
                <div class="search-box">
                    <span>⌕</span>

                    <input
                        v-model="buscador"
                        type="text"
                        placeholder="Buscar paciente..."
                    />
                </div>

                <div class="patient-list">

                    <button
                        v-for="paciente in pacientesFiltrados"
                        :key="paciente.id"
                        class="patient-option"
                        :disabled="guardando"
                        :class="{
                            selected:
                                pacienteSeleccionadoId === paciente.id
                        }"
                        @click="seleccionarPaciente(paciente)"
                    >
                        <div class="avatar">
                            {{ paciente.nombre.charAt(0) }}
                        </div>

                        <div class="patient-option-info">
                            <strong>
                                {{ paciente.nombre }}
                                {{ paciente.apellido }}
                            </strong>

                            <span>
                                DNI: {{ paciente.dni }}
                            </span>

                            <small>
                                Paciente #{{ paciente.id }}
                            </small>
                        </div>

                        <span class="arrow">→</span>
                    </button>

                    <div
                        v-if="pacientesFiltrados.length === 0"
                        class="empty"
                    >
                        No se encontraron pacientes.
                    </div>

                </div>
            </div>

            <!-- FICHA DEMOGRÁFICA -->
            <div
                v-if="pacienteSeleccionado"
                id="ficha"
                class="patient-profile"
            >
                <div class="profile-header">

                    <div class="profile-avatar">
                        {{ pacienteSeleccionado.nombre.charAt(0) }}
                    </div>

                    <div>
                        <span class="card-label">FICHA DEL PACIENTE</span>

                        <h2>
                            {{ pacienteSeleccionado.nombre }}
                            {{ pacienteSeleccionado.apellido }}
                        </h2>

                        <p>
                            Historia clínica:
                            Paciente #{{ pacienteSeleccionado.id }}
                        </p>
                    </div>
                </div>

                <div class="profile-grid">

                    <div class="profile-field">
                        <span>DNI</span>
                        <strong>{{ pacienteSeleccionado.dni }}</strong>
                    </div>

                    <div class="profile-field">
                        <span>Fecha de nacimiento</span>
                        <strong>
                            {{ formatearFecha(pacienteSeleccionado.fecha_nacimiento) }}
                        </strong>
                    </div>

                    <div class="profile-field">
                        <span>Sexo</span>
                        <strong>{{ pacienteSeleccionado.genero }}</strong>
                    </div>

                    <div class="profile-field">
                        <span>Teléfono</span>
                        <strong>{{ pacienteSeleccionado.telefono }}</strong>
                    </div>

                    <div class="profile-field">
                        <span>Email</span>
                        <strong>{{ pacienteSeleccionado.email }}</strong>
                    </div>

                    <div class="profile-field">
                        <span>Obra social</span>
                        <strong>ID {{ pacienteSeleccionado.obra_social }}</strong>
                    </div>

                </div>
            </div>

        </section>

        <template v-if="pacienteSeleccionado && !cargandoHistoria && historiaDisponible">

            <!-- ALERGIAS -->
            <section id="alergias" class="clinical-section">

                <div class="section-title">
                    <div>
                        <span class="section-label">SEGURIDAD DEL PACIENTE</span>
                        <h2>Alergias</h2>
                        <p>
                            Sustancias y reacciones alérgicas registradas.
                        </p>
                    </div>

                    <span class="count">
                        {{ alergiasActivas.length }}
                        activas
                    </span>
                </div>

                <div class="clinical-card">

                    <div
                        v-if="alergiasActivas.length === 0"
                        class="empty"
                    >
                        No hay alergias activas registradas.
                    </div>

                    <article
                        v-for="alergia in alergiasPaciente"
                        :key="alergia.id"
                        class="record-row"
                        :class="{ inactive: alergia.estado === 'descartada' || alergia.id_alergia_nueva }"
                    >
                        <div class="record-icon allergy-icon">
                            !
                        </div>

                        <div class="record-main">
                            <div class="record-title">
                                <strong>{{ alergia.sustancia }}</strong>

                                <span
                                    class="status"
                                    :class="{
                                        active: alergia.estado === 'activa',
                                        discarded: alergia.estado === 'descartada'
                                    }"
                                >
                                    {{ alergia.estado }}
                                </span>
                            </div>

                            <p>
                                Reacción: {{ alergia.reaccion }}
                            </p>

                            <span class="record-meta">
                                Gravedad: {{ alergia.gravedad }}
                                · {{ formatearFecha(alergia.fecha_deteccion) }}
                                · {{ alergia.autor }}
                            </span>
                            <p v-if="alergia.id_alergia_nueva">
                                Versión #{{ alergia.id }} reemplazada por #{{ alergia.id_alergia_nueva }}.
                            </p>
                            <p v-if="alergia.id_alergia_anterior">
                                Versión #{{ alergia.id }} ·
                                <span v-if="!alergia.id_alergia_nueva">Vigente · </span>
                                Rectifica #{{ alergia.id_alergia_anterior }} ·
                                {{ new Date(alergia.fecha_registro).toLocaleString('es-AR') }}
                                · Motivo: {{ alergia.motivo }}
                            </p>
                            <button
                                v-if="puedeRegistrar && historialAlergiasDisponible && !alergia.id_alergia_nueva"
                                type="button"
                                :disabled="guardando"
                                @click="prepararRectificacion(alergia)"
                            >
                                Rectificar
                            </button>
                        </div>
                    </article>

                    <div v-if="puedeRegistrar" class="form-divider"></div>

                    <p v-if="errorHistorialAlergias" role="status">No se pudo consultar el historial de rectificaciones.</p>
                    <h3 v-if="puedeRegistrar">
                        {{ rectificacion ? 'Rectificar alergia #' + rectificacion.id : 'Registrar nueva alergia' }}
                    </h3>

                    <form v-if="puedeRegistrar" @submit.prevent="registrarAlergia">
                        <fieldset :disabled="guardando || cargandoHistoria">

                        <div class="form-grid">

                            <div class="form-group">
                                <label>Sustancia o agente</label>

                                <input
                                    v-model="formularioAlergia.sustancia"
                                    type="text"
                                    placeholder="Ej. Penicilina"
                                    required
                                />
                            </div>

                            <div class="form-group">
                                <label>Tipo de reacción</label>

                                <input
                                    v-model="formularioAlergia.reaccion"
                                    type="text"
                                    placeholder="Ej. Erupción cutánea"
                                    required
                                />
                            </div>

                            <div class="form-group">
                                <label>Fecha de deteccion</label>
                                <input v-model="formularioAlergia.fecha_deteccion" type="date" required />
                            </div>
                            <div class="form-group">
                                <label>Gravedad</label>

                                <select v-model="formularioAlergia.gravedad">
                                    <option value="leve">Leve</option>
                                    <option value="moderada">Moderada</option>
                                    <option value="grave">Grave</option>
                                </select>
                            </div>

                        </div>

                        <div v-if="rectificacion" class="form-grid">
                            <label class="form-group">
                                Estado
                                <select v-model="rectificacion.estado">
                                    <option value="activa">Activa</option>
                                    <option value="descartada">Descartada</option>
                                </select>
                            </label>
                            <label class="form-group">
                                Motivo de rectificación
                                <textarea v-model="rectificacion.motivo" maxlength="500" required></textarea>
                            </label>
                        </div>
                        <div class="form-actions">
                            <button v-if="rectificacion" type="button" @click="rectificacion = null">
                                Cancelar
                            </button>
                            <button class="primary-button" type="submit">
                                {{ rectificacion ? 'Guardar rectificación' : '+ Registrar alergia' }}
                            </button>
                        </div>

                    </fieldset>
                    </form>
                </div>
            </section>

            <!-- ANTECEDENTES FAMILIARES -->
            <section id="antecedentes" class="clinical-section">

                <div class="section-title">
                    <div>
                        <span class="section-label">INFORMACIÓN HEREDITARIA</span>
                        <h2>Antecedentes familiares</h2>
                        <p>
                            Condiciones médicas relevantes de familiares.
                        </p>
                    </div>
                </div>

                <div class="clinical-card">

                    <div
                        v-if="antecedentesPaciente.length === 0"
                        class="empty"
                    >
                        No hay antecedentes familiares registrados.
                    </div>

                    <article
                        v-for="antecedente in antecedentesPaciente"
                        :key="antecedente.id"
                        class="record-row"
                    >
                        <div class="record-icon family-icon">
                            ♧
                        </div>

                        <div class="record-main">
                            <strong>{{ antecedente.enfermedad }}</strong>

                            <p>
                                Parentesco: {{ antecedente.parentesco }}
                            </p>

                            <span class="record-meta">
                                {{ antecedente.observaciones || 'Sin observaciones' }}
                                · {{ formatearFecha(antecedente.fecha_registro) }}
                                · {{ antecedente.autor }}
                            </span>
                        </div>
                    </article>

                    <div v-if="puedeRegistrar" class="form-divider"></div>

                    <h3 v-if="puedeRegistrar">Registrar antecedente</h3>

                    <form v-if="puedeRegistrar" @submit.prevent="registrarAntecedente">
                        <fieldset :disabled="guardando || cargandoHistoria">

                        <div class="form-grid">

                            <div class="form-group">
                                <label>Parentesco</label>

                                <select
                                    v-model="nuevoAntecedente.parentesco"
                                    required
                                >
                                    <option value="" disabled>
                                        Seleccionar parentesco
                                    </option>

                                    <option>Padre</option>
                                    <option>Madre</option>
                                    <option>Hermano/a</option>
                                    <option>Abuelo/a</option>
                                    <option>Otro</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label>Condición o enfermedad</label>

                                <input
                                    v-model="nuevoAntecedente.condicion"
                                    type="text"
                                    placeholder="Ej. Diabetes tipo 2"
                                    required
                                />
                            </div>

                            <div class="form-group full">
                                <label>Observaciones</label>

                                <textarea
                                    v-model="nuevoAntecedente.observaciones"
                                    rows="3"
                                    placeholder="Agregar información adicional..."
                                ></textarea>
                            </div>

                        </div>

                        <div class="form-actions">
                            <button class="primary-button" type="submit">
                                + Registrar antecedente
                            </button>
                        </div>

                    </fieldset>
                    </form>
                </div>
            </section>

            <!-- EVOLUCIONES -->
            <section id="evoluciones" class="clinical-section">

                <div class="section-title">
                    <div>
                        <span class="section-label">SEGUIMIENTO MÉDICO</span>
                        <h2>Evoluciones médicas</h2>
                        <p>
                            Historial cronológico de las atenciones realizadas.
                        </p>
                    </div>

                    <span class="count">
                        {{ evolucionesPaciente.length }} registros
                    </span>
                </div>

                <div class="clinical-card">

                    <div
                        v-if="evolucionesPaciente.length === 0"
                        class="empty"
                    >
                        No hay evoluciones médicas registradas.
                    </div>

                    <article
                        v-for="evolucion in evolucionesPaciente"
                        :key="evolucion.id"
                        class="evolution-row"
                    >
                        <div class="timeline-point"></div>

                        <div class="evolution-content">

                            <div class="record-title">
                                <strong>{{ evolucion.diagnostico }}</strong>

                                <span class="record-meta">
                                    {{ formatearFecha(evolucion.fecha_registro) }}
                                </span>
                            </div>

                            <p>{{ evolucion.descripcion }}</p>

                            <span class="record-meta">
                                Registrado por: {{ evolucion.autor }}
                            </span>

                            <span class="immutable">
                                ✓ Registro clínico inmutable
                            </span>

                        </div>
                    </article>

                    <div v-if="puedeRegistrar" class="form-divider"></div>

                    <h3 v-if="puedeRegistrar">Registrar evolución médica</h3>

                    <form v-if="puedeRegistrar" @submit.prevent="registrarEvolucion">
                        <fieldset :disabled="guardando || cargandoHistoria">

                        <div class="form-group">
                            <label>Diagnostico</label>
                            <input v-model="nuevaEvolucion.diagnostico" type="text" maxlength="255" required />
                        </div>

                        <div class="form-group">
                            <label>Descripción de la evolución</label>

                            <textarea
                                v-model="nuevaEvolucion.descripcion"
                                rows="4"
                                placeholder="Describir el estado y evolución del paciente..."
                                required
                            ></textarea>
                        </div>

                        <div class="form-actions">
                            <button class="primary-button" type="submit">
                                + Guardar evolución
                            </button>
                        </div>

                    </fieldset>
                    </form>
                </div>
            </section>

            <!-- ESTUDIOS -->
            <section id="estudios" class="clinical-section">

                <div class="section-title">
                    <div>
                        <span class="section-label">DIAGNÓSTICO</span>
                        <h2>Estudios clínicos</h2>
                        <p>
                            Estudios realizados y resultados disponibles.
                        </p>
                    </div>

                    <span class="count">
                        {{ estudiosPaciente.length }} estudios
                    </span>
                </div>

                <div class="clinical-card">

                    <div
                        v-if="estudiosPaciente.length === 0"
                        class="empty"
                    >
                        No hay estudios clínicos disponibles.
                    </div>

                    <article
                        v-for="estudio in estudiosPaciente"
                        :key="estudio.id"
                        class="study-row"
                    >
                        <div class="record-icon study-icon">
                            ▣
                        </div>

                        <div class="record-main">
                            <strong>{{ estudio.tipo_estudio }}</strong>

                            <span class="record-meta">
                                Fecha: {{ formatearFecha(estudio.fecha_registro) }}
                            </span>

                            <p>
                                {{ estudio.resultado || estudio.descripcion || 'Sin resultado registrado.' }}
                            </p>
                        </div>

                        <span class="read-only">
                            Solo lectura
                        </span>
                    </article>

                </div>
            </section>

        </template>

    </main>
</div>
</template>

<style scoped>
fieldset { border: 0; padding: 0; margin: 0; min-width: 0; }
fieldset:disabled { opacity: 0.65; }
.feedback-error { color: #b91c1c; }
.historia-clinica {
min-height: 100vh;
background: #f5f8fc;
color: #102a43;
font-family:
Inter,
-apple-system,
BlinkMacSystemFont,
"Segoe UI",
sans-serif;
}

/* HEADER */

.topbar {
min-height: 110px;
padding: 28px 42px;
background: white;
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

.module-status {
display: flex;
align-items: center;
gap: 8px;
color: #698198;
font-size: 11px;
}

.status-dot {
width: 7px;
height: 7px;
border-radius: 50%;
background: #20bf6b;
}

/* CONTENIDO */

.content {
width: 100%;
max-width: 1500px;
margin: 0 auto;
padding: 32px 42px;
box-sizing: border-box;
}

.section-header {
margin-bottom: 18px;
}

.section-label {
color: #087fc4;
font-size: 9px;
font-weight: 800;
letter-spacing: 1.3px;
}

.section-header h2,
.section-title h2 {
margin: 6px 0;
color: #123450;
font-size: 19px;
}

.section-header p,
.section-title p {
margin: 0;
color: #8195a9;
font-size: 11px;
}

/* BUSCADOR Y PACIENTE */

.search-layout {
display: grid;
grid-template-columns: minmax(260px, 0.85fr) minmax(0, 2fr);
gap: 18px;
align-items: start;
}

.search-panel,
.patient-profile,
.clinical-card {
background: white;
border: 1px solid #e3eaf2;
border-radius: 12px;
box-shadow: 0 3px 12px rgba(21, 52, 80, 0.03);
}

.search-panel {
padding: 16px;
}

.search-box {
display: flex;
align-items: center;
gap: 10px;
padding: 11px 12px;
background: #f7fafd;
border: 1px solid #dfe7ed;
border-radius: 8px;
}

.search-box span {
color: #7890a2;
font-size: 20px;
}

.search-box input {
width: 100%;
border: none;
outline: none;
background: transparent;
color: #263d4e;
font-size: 12px;
}

.patient-list {
display: flex;
flex-direction: column;
gap: 8px;
margin-top: 14px;
}

.patient-option {
width: 100%;
display: flex;
align-items: center;
gap: 11px;
padding: 12px;
text-align: left;
background: white;
border: 1px solid transparent;
border-radius: 8px;
cursor: pointer;
}

.patient-option:hover,
.patient-option.selected {
background: #f0f8fd;
border-color: #b9e2f8;
}

.avatar {
width: 38px;
height: 38px;
flex-shrink: 0;
display: flex;
align-items: center;
justify-content: center;
border-radius: 50%;
background: #e7f5fd;
color: #087fc4;
font-weight: 700;
}

.patient-option-info {
flex: 1;
}

.patient-option-info strong {
display: block;
color: #20394b;
font-size: 11px;
}

.patient-option-info span,
.patient-option-info small {
display: block;
margin-top: 4px;
color: #8295a7;
font-size: 10px;
}

.arrow {
color: #087fc4;
}

.patient-profile {
padding: 24px;
scroll-margin-top: 20px;
}

.profile-header {
display: flex;
align-items: center;
gap: 15px;
padding-bottom: 20px;
border-bottom: 1px solid #e8eef4;
}

.profile-avatar {
width: 52px;
height: 52px;
display: flex;
align-items: center;
justify-content: center;
border-radius: 50%;
background: #e5f5ff;
color: #087fc4;
font-size: 19px;
font-weight: 700;
}

.card-label {
color: #087fc4;
font-size: 9px;
font-weight: 800;
letter-spacing: 1.2px;
}

.profile-header h2 {
margin: 5px 0;
color: #123450;
font-size: 20px;
}

.profile-header p {
margin: 0;
color: #8295a8;
font-size: 11px;
}

.profile-grid {
display: grid;
grid-template-columns: repeat(3, 1fr);
gap: 22px 15px;
padding-top: 22px;
}

.profile-field span {
display: block;
margin-bottom: 5px;
color: #8295a8;
font-size: 10px;
}

.profile-field strong {
color: #263f51;
font-size: 12px;
}

/* SECCIONES */

.clinical-section {
margin-top: 30px;
scroll-margin-top: 20px;
}

.section-title {
display: flex;
justify-content: space-between;
align-items: flex-end;
margin-bottom: 14px;
}

.count {
padding: 9px 13px;
border: 1px solid #e3eaf2;
border-radius: 7px;
background: white;
color: #087fc4;
font-size: 10px;
font-weight: 700;
}

.clinical-card {
padding: 22px;
}

.clinical-card h3 {
margin: 0 0 16px;
color: #20394b;
font-size: 14px;
}

/* REGISTROS */

.record-row,
.study-row {
display: flex;
align-items: center;
gap: 14px;
padding: 16px 0;
border-bottom: 1px solid #edf1f4;
}

.record-row.inactive {
opacity: 0.65;
}

.record-icon {
width: 38px;
height: 38px;
flex-shrink: 0;
display: flex;
align-items: center;
justify-content: center;
border-radius: 9px;
font-size: 17px;
font-weight: 700;
}

.allergy-icon {
background: #fff0f0;
color: #d83b3b;
}

.family-icon {
background: #eaf6ff;
color: #087fc4;
}

.study-icon {
background: #eef0ff;
color: #6875d8;
}

.record-main {
flex: 1;
min-width: 0;
}

.record-main > strong {
color: #263f51;
font-size: 13px;
}

.record-title {
display: flex;
align-items: center;
justify-content: space-between;
gap: 10px;
}

.record-title strong {
color: #263f51;
font-size: 13px;
}

.record-main p,
.evolution-content p {
margin: 6px 0;
color: #718496;
font-size: 11px;
line-height: 1.5;
}

.record-meta {
display: block;
margin-top: 5px;
color: #91a0ad;
font-size: 9px;
line-height: 1.5;
}

.status {
padding: 5px 9px;
border-radius: 6px;
font-size: 9px;
font-weight: 700;
}

.status.active {
background: #fff0f0;
color: #d83b3b;
}

.status.discarded {
background: #edf1f4;
color: #718496;
}



.form-divider {
height: 1px;
margin: 22px 0;
background: #e8eef4;
}

/* FORMULARIOS */

.form-grid {
display: grid;
grid-template-columns: repeat(2, 1fr);
gap: 15px;
}

.form-group {
margin-bottom: 16px;
}

.form-group.full {
grid-column: 1 / -1;
}

.form-group label {
display: block;
margin-bottom: 7px;
color: #526b80;
font-size: 11px;
font-weight: 600;
}

.form-group input,
.form-group select,
.form-group textarea {
width: 100%;
box-sizing: border-box;
padding: 11px 12px;
border: 1px solid #dce5eb;
border-radius: 7px;
outline: none;
background: white;
color: #294152;
font-family: inherit;
font-size: 12px;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
border-color: #087fc4;
}

.form-group textarea {
resize: vertical;
}

.form-actions {
display: flex;
justify-content: flex-end;
margin-top: 8px;
}

.primary-button {
padding: 11px 17px;
border: none;
border-radius: 8px;
background: #1089d4;
color: white;
font-size: 11px;
font-weight: 600;
cursor: pointer;
}

.primary-button:hover {
background: #0878bd;
}

/* EVOLUCIONES */

.evolution-row {
position: relative;
display: flex;
gap: 15px;
padding: 16px 0;
border-bottom: 1px solid #edf1f4;
}

.timeline-point {
width: 10px;
height: 10px;
flex-shrink: 0;
margin-top: 4px;
border: 3px solid #b9e2f8;
border-radius: 50%;
background: #087fc4;
}

.evolution-content {
flex: 1;
}

.immutable {
display: inline-block;
margin-top: 9px;
padding: 5px 8px;
border-radius: 5px;
background: #e8f7ef;
color: #238452;
font-size: 9px;
font-weight: 600;
}

/* ESTUDIOS */

.study-row {
align-items: flex-start;
}

.read-only {
padding: 6px 9px;
border-radius: 6px;
background: #f1f7fb;
color: #087fc4;
font-size: 9px;
font-weight: 600;
}

/* VACÍOS */

.empty {
padding: 30px 15px;
text-align: center;
color: #8293a1;
font-size: 11px;
}

/* RESPONSIVE */

@media (max-width: 1000px) {
.search-layout {
grid-template-columns: 1fr;
}

.profile-grid {
grid-template-columns: repeat(2, 1fr);
}
}

@media (max-width: 800px) {
.topbar {
padding: 22px;
}

.module-status {
display: none;
}

.content {
padding: 22px;
}

.profile-grid {
grid-template-columns: 1fr;
}

.section-title {
align-items: flex-start;
gap: 12px;
}

.record-row {
flex-wrap: wrap;
}

.form-grid {
grid-template-columns: 1fr;
}

.form-group.full {
grid-column: auto;
}
}
</style>
