
<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";

interface Paciente {
    id: number;
    nombre: string;
    apellido: string;
    dni: string;
    fechaNacimiento: string;
    genero: string;
    telefono: string;
    email: string;
    obraSocial: number;
}

interface ObraSocial {
    id: number;
    nombre: string;
}

interface RespuestaPacientes {
    pacientes: Paciente[];
}

interface RespuestaObrasSociales {
    obrasSociales: ObraSocial[];
}

const pacientes = ref<Paciente[]>([]);
const obrasSociales = ref<ObraSocial[]>([]);

const busqueda = ref("");
const filtroCobertura = ref<number | "todas">("todas");

const mostrarFormulario = ref(false);
const cargando = ref(false);
const registrando = ref(false);

const mensaje = ref("");
const error = ref("");
const errorCarga = ref("");

const nuevoPaciente = reactive({
    nombre: "",
    apellido: "",
    dni: "",
    fechaNacimiento: "",
    genero: "",
    telefono: "",
    email: "",
    obraSocial: 0
});

// =====================================================
// CARGAR PACIENTES Y OBRAS SOCIALES DESDE EXPRESS
// =====================================================

async function cargarDatos() {
    cargando.value = true;
    errorCarga.value = "";

    try {
        const [respuestaPacientes, respuestaObras] = await Promise.all([
            fetch("/api/admisiones/pacientes", {
                method: "GET",
                credentials: "same-origin"
            }),

            fetch("/api/admisiones/obras-sociales", {
                method: "GET",
                credentials: "same-origin"
            })
        ]);

        if (
            respuestaPacientes.status === 401 ||
            respuestaObras.status === 401
        ) {
            throw new Error(
                "Tu sesión expiró. Volvé a iniciar sesión."
            );
        }

        if (!respuestaPacientes.ok || !respuestaObras.ok) {
            throw new Error(
                "No se pudieron cargar los datos del servidor."
            );
        }

        const datosPacientes =
            await respuestaPacientes.json() as RespuestaPacientes;

        const datosObras =
            await respuestaObras.json() as RespuestaObrasSociales;

        if (
            !Array.isArray(datosPacientes.pacientes) ||
            !Array.isArray(datosObras.obrasSociales)
        ) {
            throw new Error(
                "El servidor devolvió información inválida."
            );
        }

        pacientes.value = datosPacientes.pacientes;
        obrasSociales.value = datosObras.obrasSociales;

        nuevoPaciente.obraSocial =
            obrasSociales.value[0]?.id ?? 0;

    } catch (err) {

        errorCarga.value = err instanceof Error
            ? err.message
            : "Ocurrió un error al cargar los datos.";

    } finally {

        cargando.value = false;

    }
}

// =====================================================
// FILTRADO DE PACIENTES
// =====================================================

const pacientesFiltrados = computed(() => {

    return pacientes.value.filter((paciente) => {

        const texto = busqueda.value.toLowerCase().trim();

        const nombreCompleto =
            `${paciente.nombre} ${paciente.apellido}`.toLowerCase();

        const coincideBusqueda =
            nombreCompleto.includes(texto) ||
            paciente.dni.includes(texto);

        const coincideCobertura =
            filtroCobertura.value === "todas" ||
            paciente.obraSocial === filtroCobertura.value;

        return coincideBusqueda && coincideCobertura;

    });

});

// =====================================================
// DATOS DE RESUMEN
// =====================================================

const totalPacientes = computed(() => {
    return pacientes.value.length;
});

const pacientesConCobertura = computed(() => {

    return pacientes.value.filter((paciente) => {

        const nombreObra = obtenerNombreObraSocial(
            paciente.obraSocial
        );

        return nombreObra.toLowerCase() !== "particular";

    }).length;

});

// =====================================================
// OBTENER NOMBRE DE LA OBRA SOCIAL
// =====================================================

function obtenerNombreObraSocial(id: number): string {

    return obrasSociales.value.find(
        (obra) => obra.id === id
    )?.nombre ?? "Sin cobertura";

}

// =====================================================
// CALCULAR EDAD
// =====================================================

function obtenerEdad(fechaNacimiento: string): number {

    const nacimiento = new Date(`${fechaNacimiento}T00:00:00`);
    const hoy = new Date();

    let edad = hoy.getFullYear() - nacimiento.getFullYear();

    const noCumplioAnios =
        hoy.getMonth() < nacimiento.getMonth() ||
        (
            hoy.getMonth() === nacimiento.getMonth() &&
            hoy.getDate() < nacimiento.getDate()
        );

    if (noCumplioAnios) {
        edad--;
    }

    return edad;

}

// =====================================================
// LIMPIAR FORMULARIO
// =====================================================

function limpiarFormulario() {

    nuevoPaciente.nombre = "";
    nuevoPaciente.apellido = "";
    nuevoPaciente.dni = "";
    nuevoPaciente.fechaNacimiento = "";
    nuevoPaciente.genero = "";
    nuevoPaciente.telefono = "";
    nuevoPaciente.email = "";

    nuevoPaciente.obraSocial =
        obrasSociales.value[0]?.id ?? 0;

}

// =====================================================
// ABRIR FORMULARIO
// =====================================================

function abrirFormulario() {

    error.value = "";
    mensaje.value = "";

    limpiarFormulario();

    mostrarFormulario.value = true;

}

// =====================================================
// REGISTRAR PACIENTE EN MYSQL
// =====================================================

async function registrarPaciente() {

    if (registrando.value) return;

    error.value = "";
    mensaje.value = "";

    const dni = nuevoPaciente.dni.trim();

    if (!nuevoPaciente.obraSocial) {

        error.value = "Seleccioná una obra social.";
        return;

    }

    // Comprobación local para evitar duplicados visibles.
    // El backend y MySQL realizan la validación definitiva.

    const dniExistente = pacientes.value.some(
        (paciente) => paciente.dni === dni
    );

    if (dniExistente) {

        error.value =
            "Ya existe un paciente registrado con ese DNI.";

        return;

    }

    registrando.value = true;

    try {

        const respuesta = await fetch(
            "/api/admisiones/pacientes",
            {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    nombre: nuevoPaciente.nombre.trim(),
                    apellido: nuevoPaciente.apellido.trim(),
                    dni,
                    fechaNacimiento: nuevoPaciente.fechaNacimiento,
                    genero: nuevoPaciente.genero,
                    telefono: nuevoPaciente.telefono.trim(),
                    email: nuevoPaciente.email.trim(),
                    obraSocial: nuevoPaciente.obraSocial
                })
            }
        );

        const datos = await respuesta.json() as {
            mensaje?: string;
            paciente?: Paciente;
        };

        if (respuesta.status === 401) {

            error.value =
                "Tu sesión expiró. Volvé a iniciar sesión.";

            return;

        }

        if (respuesta.status === 409) {

            error.value = datos.mensaje ??
                "Ya existe un paciente registrado con ese DNI.";

            return;

        }

        if (!respuesta.ok) {

            throw new Error(
                datos.mensaje ??
                "No se pudo registrar el paciente."
            );

        }

        if (!datos.paciente) {

            throw new Error(
                "El servidor no devolvió los datos del paciente."
            );

        }

        // Agregamos el paciente que devuelve MySQL.
        pacientes.value.push(datos.paciente);

        // Limpiamos los filtros para que se pueda visualizar.
        busqueda.value = "";
        filtroCobertura.value = "todas";

        limpiarFormulario();

        mostrarFormulario.value = false;

        mensaje.value =
            "El paciente fue registrado correctamente.";

    } catch (err) {

        error.value = err instanceof Error
            ? err.message
            : "Ocurrió un error al registrar el paciente.";

    } finally {

        registrando.value = false;

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
    <section class="pacientes-view">

        <!-- ENCABEZADO -->
        <header class="page-header">

            <div>
                <span class="eyebrow">ADMISIONES</span>

                <h1>Pacientes</h1>

                <p>
                    Consultá y administrá los pacientes registrados en el hospital.
                </p>
            </div>

            <button
                class="btn-primary"
                type="button"
                @click="abrirFormulario"
            >
                <span class="plus-icon">+</span>
                Nuevo paciente
            </button>

        </header>

        <!-- MENSAJE DE ÉXITO -->
        <div v-if="mensaje" class="feedback success">

            {{ mensaje }}

            <button
                type="button"
                @click="mensaje = ''"
            >
                ×
            </button>

        </div>

        <!-- ESTADO DE CARGA -->
        <div v-if="cargando" class="feedback">
            Cargando pacientes y obras sociales...
        </div>

        <!-- ERROR DE CARGA -->
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

        <!-- RESUMEN -->
        <div class="summary-grid">

            <article class="summary-card">

                <div class="summary-icon blue">
                    ♙
                </div>

                <div>
                    <span class="summary-label">
                        Total de pacientes
                    </span>

                    <strong>{{ totalPacientes }}</strong>

                    <small>
                        Pacientes registrados
                    </small>
                </div>

            </article>

            <article class="summary-card">

                <div class="summary-icon green">
                    ✓
                </div>

                <div>
                    <span class="summary-label">
                        Con cobertura médica
                    </span>

                    <strong>{{ pacientesConCobertura }}</strong>

                    <small>
                        Obra social o prepaga
                    </small>
                </div>

            </article>

            <article class="summary-card">

                <div class="summary-icon orange">
                    ＋
                </div>

                <div>
                    <span class="summary-label">
                        Atención particular
                    </span>

                    <strong>
                        {{ totalPacientes - pacientesConCobertura }}
                    </strong>

                    <small>
                        Sin cobertura de obra social
                    </small>
                </div>

            </article>

        </div>

        <!-- LISTADO -->
        <section class="table-section">

            <div class="section-heading">

                <div>
                    <h2>Listado de pacientes</h2>

                    <p>
                        Encontrá rápidamente la información de cada paciente.
                    </p>
                </div>

                <span class="result-count">
                    {{ pacientesFiltrados.length }} resultados
                </span>

            </div>

            <!-- FILTROS -->
            <div class="filters">

                <div class="search-box">

                    <span>⌕</span>

                    <input
                        v-model="busqueda"
                        type="text"
                        placeholder="Buscar por nombre, apellido o DNI..."
                    />

                </div>

                <select
                    v-model="filtroCobertura"
                    aria-label="Filtrar por cobertura"
                >

                    <option value="todas">
                        Todas las coberturas
                    </option>

                    <option
                        v-for="obra in obrasSociales"
                        :key="obra.id"
                        :value="obra.id"
                    >
                        {{ obra.nombre }}
                    </option>

                </select>

            </div>

            <!-- TABLA -->
            <div class="table-wrapper">

                <table>

                    <thead>
                        <tr>
                            <th>Paciente</th>
                            <th>DNI</th>
                            <th>Edad</th>
                            <th>Teléfono</th>
                            <th>Cobertura</th>
                            <th>Contacto</th>
                        </tr>
                    </thead>

                    <tbody>

                        <tr
                            v-for="paciente in pacientesFiltrados"
                            :key="paciente.id"
                        >

                            <td>

                                <div class="patient-cell">

                                    <div class="avatar">

                                        {{ paciente.nombre.charAt(0) }}{{ paciente.apellido.charAt(0) }}

                                    </div>

                                    <div>

                                        <strong>
                                            {{ paciente.apellido }},
                                            {{ paciente.nombre }}
                                        </strong>

                                        <small>
                                            {{ paciente.genero }}
                                        </small>

                                    </div>

                                </div>

                            </td>

                            <td>{{ paciente.dni }}</td>

                            <td>
                                {{ obtenerEdad(paciente.fechaNacimiento) }} años
                            </td>

                            <td>{{ paciente.telefono }}</td>

                            <td>

                                <span
                                    class="coverage-badge"
                                    :class="{
                                        particular:
                                            obtenerNombreObraSocial(paciente.obraSocial).toLowerCase() === 'particular'
                                    }"
                                >
                                    {{ obtenerNombreObraSocial(paciente.obraSocial) }}
                                </span>

                            </td>

                            <td>

                                <a
                                    class="email-link"
                                    :href="`mailto:${paciente.email}`"
                                >
                                    Enviar email
                                </a>

                            </td>

                        </tr>

                        <!-- SIN RESULTADOS -->
                        <tr v-if="!cargando && pacientesFiltrados.length === 0">

                            <td colspan="6" class="empty-state">

                                <strong>
                                    No se encontraron pacientes.
                                </strong>

                                <p>
                                    Probá modificando los criterios de búsqueda.
                                </p>

                            </td>

                        </tr>

                    </tbody>

                </table>

            </div>

        </section>

        <!-- MODAL REGISTRAR PACIENTE -->
        <div
            v-if="mostrarFormulario"
            class="modal-overlay"
            @click.self="mostrarFormulario = false"
        >

            <section class="modal">

                <header class="modal-header">

                    <div>

                        <span class="eyebrow">
                            ADMISIONES
                        </span>

                        <h2>Registrar paciente</h2>

                        <p>
                            Completá los datos personales del nuevo paciente.
                        </p>

                    </div>

                    <button
                        class="close-button"
                        type="button"
                        aria-label="Cerrar"
                        @click="mostrarFormulario = false"
                    >
                        ×
                    </button>

                </header>

                <form
                    class="patient-form"
                    @submit.prevent="registrarPaciente"
                >

                    <div class="form-grid">

                        <label>

                            Nombre

                            <input
                                v-model.trim="nuevoPaciente.nombre"
                                type="text"
                                required
                                maxlength="45"
                            />

                        </label>

                        <label>

                            Apellido

                            <input
                                v-model.trim="nuevoPaciente.apellido"
                                type="text"
                                required
                                maxlength="45"
                            />

                        </label>

                        <label>

                            DNI

                            <input
                                v-model.trim="nuevoPaciente.dni"
                                type="text"
                                required
                                maxlength="45"
                                inputmode="numeric"
                            />

                        </label>

                        <label>

                            Fecha de nacimiento

                            <input
                                v-model="nuevoPaciente.fechaNacimiento"
                                type="date"
                                required
                            />

                        </label>

                        <label>

                            Género

                            <select
                                v-model="nuevoPaciente.genero"
                                required
                            >

                                <option value="" disabled>
                                    Seleccionar
                                </option>

                                <option value="Femenino">
                                    Femenino
                                </option>

                                <option value="Masculino">
                                    Masculino
                                </option>

                                <option value="Otro">
                                    Otro
                                </option>

                            </select>

                        </label>

                        <label>

                            Teléfono

                            <input
                                v-model.trim="nuevoPaciente.telefono"
                                type="tel"
                                required
                                maxlength="45"
                            />

                        </label>

                        <label class="full-width">

                            Correo electrónico

                            <input
                                v-model.trim="nuevoPaciente.email"
                                type="email"
                                required
                                maxlength="45"
                            />

                        </label>

                        <label class="full-width">

                            Cobertura médica

                            <select
                                v-model.number="nuevoPaciente.obraSocial"
                                required
                            >

                                <option
                                    :value="0"
                                    disabled
                                >
                                    Seleccionar obra social
                                </option>

                                <option
                                    v-for="obra in obrasSociales"
                                    :key="obra.id"
                                    :value="obra.id"
                                >
                                    {{ obra.nombre }}
                                </option>

                            </select>

                        </label>

                    </div>

                    <!-- ERROR DEL REGISTRO -->
                    <p
                        v-if="error"
                        class="feedback error"
                    >
                        {{ error }}
                    </p>

                    <!-- ACCIONES -->
                    <footer class="modal-actions">

                        <button
                            class="btn-secondary"
                            type="button"
                            :disabled="registrando"
                            @click="mostrarFormulario = false"
                        >
                            Cancelar
                        </button>

                        <button
                            class="btn-primary"
                            type="submit"
                            :disabled="registrando || obrasSociales.length === 0"
                        >
                            {{
                                registrando
                                    ? "Registrando..."
                                    : "Registrar paciente"
                            }}
                        </button>

                    </footer>

                </form>

            </section>

        </div>

    </section>
</template>

<style scoped>
.pacientes-view {
    padding: 30px 34px;
    color: #263445;
    min-height: 100%;
    background: #f7f9fc;
}

.page-header,
.section-heading,
.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
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
    font-weight: 700;
}

.page-header p,
.section-heading p,
.modal-header p {
    margin: 0;
    color: #8190a1;
    font-size: 14px;
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

.btn-primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    padding: 11px 17px;
    border: none;
    border-radius: 8px;
    background: #087fc4;
    color: white;
    font-size: 13px;
    font-weight: 600;
    transition: background 0.2s;
}

.btn-primary:hover:not(:disabled) {
    background: #066da9;
}

.plus-icon {
    font-size: 19px;
    line-height: 12px;
}

/* MENSAJES */

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

.feedback.error {
    color: #b42318;
    background: #fff0ee;
}

.feedback button {
    border: none;
    background: transparent;
    color: inherit;
    font-size: 19px;
}

.retry-button {
    padding: 6px 10px;
    border: 1px solid #d6b5b5;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
}

/* TARJETAS DE RESUMEN */

.summary-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
    margin: 28px 0;
}

.summary-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 22px;
    background: white;
    border: 1px solid #e9eef4;
    border-radius: 12px;
}

.summary-icon {
    display: grid;
    place-items: center;
    width: 46px;
    height: 46px;
    border-radius: 11px;
    font-size: 22px;
    font-weight: 600;
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

.summary-label,
.summary-card small {
    display: block;
    color: #8491a1;
    font-size: 12px;
}

.summary-card strong {
    display: block;
    margin: 5px 0;
    color: #263445;
    font-size: 25px;
}

/* TABLA */

.table-section {
    padding: 24px;
    background: white;
    border: 1px solid #e9eef4;
    border-radius: 12px;
}

.section-heading {
    margin-bottom: 22px;
}

.section-heading h2 {
    margin: 0 0 6px;
    font-size: 18px;
}

.result-count {
    color: #087fc4;
    background: #eaf5fc;
    border-radius: 20px;
    padding: 7px 12px;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
}

.filters {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
}

.search-box {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    padding: 0 13px;
    border: 1px solid #e1e7ef;
    border-radius: 8px;
    color: #8491a1;
}

.search-box span {
    font-size: 23px;
}

.search-box input {
    width: 100%;
    border: none;
    outline: none;
    padding: 11px 0;
    font-size: 13px;
}

.filters select,
.patient-form input,
.patient-form select {
    padding: 11px 12px;
    border: 1px solid #e1e7ef;
    border-radius: 8px;
    outline-color: #087fc4;
    background: white;
    color: #344255;
    font-size: 13px;
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
    color: #8491a1;
    background: #f8fafc;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    white-space: nowrap;
}

td {
    padding: 15px 12px;
    border-bottom: 1px solid #edf1f5;
    color: #536174;
    font-size: 13px;
    white-space: nowrap;
}

tbody tr:last-child td {
    border-bottom: none;
}

.patient-cell {
    display: flex;
    align-items: center;
    gap: 11px;
}

.patient-cell strong,
.patient-cell small {
    display: block;
}

.patient-cell strong {
    color: #344255;
    font-size: 13px;
}

.patient-cell small {
    margin-top: 4px;
    color: #94a0ae;
    font-size: 11px;
}

.avatar {
    display: grid;
    place-items: center;
    width: 37px;
    height: 37px;
    flex-shrink: 0;
    border-radius: 50%;
    background: #e8f4fc;
    color: #087fc4;
    font-size: 11px;
    font-weight: 700;
}

.coverage-badge {
    display: inline-block;
    padding: 5px 9px;
    border-radius: 20px;
    color: #21835f;
    background: #e9f7f0;
    font-size: 11px;
    font-weight: 600;
}

.coverage-badge.particular {
    color: #a87520;
    background: #fff5e5;
}

.email-link {
    color: #087fc4;
    text-decoration: none;
    font-weight: 600;
}

.email-link:hover {
    text-decoration: underline;
}

.empty-state {
    padding: 35px;
    text-align: center;
    color: #8491a1;
}

.empty-state strong {
    display: block;
    margin-bottom: 6px;
}

.empty-state p {
    margin: 0;
    font-size: 12px;
}

/* MODAL */

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
    width: min(620px, 100%);
    max-height: 90vh;
    overflow-y: auto;
    padding: 27px;
    border-radius: 14px;
    background: white;
    box-shadow: 0 15px 50px rgb(0 0 0 / 15%);
}

.modal-header {
    align-items: flex-start;
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

.form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 17px;
}

.patient-form label {
    display: flex;
    flex-direction: column;
    gap: 7px;
    color: #526174;
    font-size: 12px;
    font-weight: 600;
}

.patient-form input,
.patient-form select {
    width: 100%;
    box-sizing: border-box;
}

.full-width {
    grid-column: 1 / -1;
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

@media (max-width: 900px) {
    .summary-grid {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 600px) {
    .pacientes-view {
        padding: 20px 15px;
    }

    .page-header {
        align-items: flex-start;
        flex-direction: column;
    }

    .filters {
        flex-direction: column;
    }

    .form-grid {
        grid-template-columns: 1fr;
    }

    .full-width {
        grid-column: auto;
    }

    .table-section {
        padding: 15px;
    }
}
</style>
