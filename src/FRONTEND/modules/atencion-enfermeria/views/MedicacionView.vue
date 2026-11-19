

<script setup lang="ts">
import { computed, ref, onMounted } from "vue";

interface DosisProgramada {
    id_indicacion_medica: number;
    id_paciente: number;
    nombre: string;
    apellido: string;
    habitacion: number;
    medicamento: string;
    cantidad: number;
    horario_programado: string;
    estado: "Futura" | "Pendiente" | "Administrada";
}

const medicaciones = ref<DosisProgramada[]>([]);
const mensaje = ref("");
const cargando = ref(false);
const administrando = ref<string | null>(null);
const cantidades_administradas = ref<Record<string, string>>({});
const puede_crear_indicaciones = ref(false);
const puede_administrar = ref(false);
const mostrar_formulario_indicacion = ref(false);
const pacientes_internados = ref<{ id: number; nombre: string; apellido: string }[]>([]);
const insumos = ref<{ id: number; nombre: string }[]>([]);
const error_opciones_indicacion = ref('');
const historial = ref<{ id: number; nombre: string; apellido: string; medicamento: string; cantidad: number; fecha_hora: string; enfermero: string }[]>([]);
const nueva_indicacion = ref({ id_paciente: '', id_insumo: '', cantidad: '', fecha: '', hora_inicio: '', frecuencia_horas: '' });

interface GrupoPaciente {
    id: number;
    nombre: string;
    apellido: string;
    habitacion: number;
    indicaciones: { id: number; medicamento: string; cantidad: number; dosis: DosisProgramada[] }[];
}

const medicaciones_agrupadas = computed<GrupoPaciente[]>(() => {
    const pacientes = new Map<number, GrupoPaciente>();
    for (const dosis of medicaciones.value) {
        let paciente = pacientes.get(dosis.id_paciente);
        if (!paciente) {
            paciente = {
                id: dosis.id_paciente,
                nombre: dosis.nombre,
                apellido: dosis.apellido,
                habitacion: dosis.habitacion,
                indicaciones: [],
            };
            pacientes.set(paciente.id, paciente);
        }
        let indicacion = paciente.indicaciones.find((item) => item.id === dosis.id_indicacion_medica);
        if (!indicacion) {
            indicacion = {
                id: dosis.id_indicacion_medica,
                medicamento: dosis.medicamento,
                cantidad: dosis.cantidad,
                dosis: [],
            };
            paciente.indicaciones.push(indicacion);
        }
        indicacion.dosis.push(dosis);
    }
    return [...pacientes.values()];
});

const pendientes = () =>
    medicaciones.value.filter(
        (medicacion) => medicacion.estado === "Pendiente"
    ).length;

function obtenerClave(medicacion: DosisProgramada): string {
    return `${medicacion.id_indicacion_medica}-${medicacion.horario_programado}`;
}

function obtenerHorario(medicacion: DosisProgramada): string {
    return new Date(medicacion.horario_programado).toLocaleTimeString(
        "es-AR",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}

function obtenerFecha(medicacion: DosisProgramada): string {
    return new Date(medicacion.horario_programado).toLocaleDateString(
        "es-AR"
    );
}

async function cargarMedicaciones(): Promise<void> {
    cargando.value = true;
    mensaje.value = "";

    try {
        const respuesta = await fetch(
            "/api/administracion-medicacion",
            {
                credentials: "include"
            }
        );

        if (!respuesta.ok) {
            throw new Error("No se pudieron cargar las medicaciones");
        }

        medicaciones.value = await respuesta.json();
        for (const medicacion of medicaciones.value) {
            const clave = obtenerClave(medicacion);
            cantidades_administradas.value[clave] ??= String(medicacion.cantidad);
        }
        await cargarHistorial();
        await cargarOpcionesIndicacion();
    } catch (error) {
        mensaje.value = error instanceof Error
            ? error.message
            : "Error al cargar las medicaciones";
    } finally {
        cargando.value = false;
    }
}

async function cargarHistorial(): Promise<void> {
    const respuesta = await fetch('/api/administracion-medicacion/historial', { credentials: 'include' });
    if (respuesta.ok) historial.value = await respuesta.json();
}

async function cargarOpcionesIndicacion(): Promise<void> {
    error_opciones_indicacion.value = '';
    try {
        const permisos = await fetch('/api/administracion-medicacion/permisos', { credentials: 'include' });
        if (!permisos.ok) throw new Error('No se pudo verificar el permiso para crear indicaciones.');
        const { puedeCrearIndicacion } = await permisos.json();
        puede_crear_indicaciones.value = puedeCrearIndicacion;
        puede_administrar.value = !puedeCrearIndicacion;
        if (!puedeCrearIndicacion) return;

        const respuesta = await fetch('/api/administracion-medicacion/opciones-indicacion', { credentials: 'include' });
        if (!respuesta.ok) {
            const resultado = await respuesta.json().catch(() => ({}));
            throw new Error(resultado.mensaje || 'No se pudieron cargar pacientes e insumos.');
        }
        const opciones = await respuesta.json();
        pacientes_internados.value = opciones.pacientes;
        insumos.value = opciones.insumos;
        puede_crear_indicaciones.value = true;
    } catch {
        error_opciones_indicacion.value = 'No se pudo conectar para cargar pacientes e insumos.';
    }
}

async function crearIndicacion(): Promise<void> {
    mensaje.value = '';
    const datos = {
        id_paciente: Number(nueva_indicacion.value.id_paciente),
        id_insumo: Number(nueva_indicacion.value.id_insumo),
        cantidad: Number(nueva_indicacion.value.cantidad),
        fecha: nueva_indicacion.value.fecha,
        hora_inicio: nueva_indicacion.value.hora_inicio,
        frecuencia_horas: Number(nueva_indicacion.value.frecuencia_horas),
    };
    if (!datos.id_paciente || !datos.id_insumo || !Number.isSafeInteger(datos.cantidad) || datos.cantidad <= 0 ||
        !Number.isSafeInteger(datos.frecuencia_horas) || datos.frecuencia_horas <= 0 || !datos.fecha || !datos.hora_inicio) {
        mensaje.value = 'Completá todos los campos con valores válidos.';
        return;
    }
    try {
        const respuesta = await fetch('/api/administracion-medicacion/indicaciones', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos),
        });
        const resultado = await respuesta.json();
        if (!respuesta.ok) throw new Error(resultado.mensaje || 'No se pudo crear la indicación.');
        mensaje.value = resultado.mensaje;
        mostrar_formulario_indicacion.value = false;
        nueva_indicacion.value = { id_paciente: '', id_insumo: '', cantidad: '', fecha: '', hora_inicio: '', frecuencia_horas: '' };
        await cargarMedicaciones();
    } catch (error) {
        mensaje.value = error instanceof Error ? error.message : 'No se pudo crear la indicación.';
    }
}


async function administrarMedicacion(
    medicacion: DosisProgramada
): Promise<void> {
    mensaje.value = "";

    if (medicacion.estado === "Administrada") {
        mensaje.value = "Esta dosis ya fue administrada";
        return;
    }

    const clave = obtenerClave(medicacion);
    const cantidad_administrada = Number(
        cantidades_administradas.value[clave]
    );

    if (
        !Number.isSafeInteger(cantidad_administrada) ||
        cantidad_administrada <= 0 ||
        cantidad_administrada !== medicacion.cantidad
    ) {
        mensaje.value = "La cantidad debe ser entera, positiva e igual a la indicada";
        return;
    }

    administrando.value = clave;

    try {
        const respuesta = await fetch(
            "/api/administracion-medicacion",
            {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    id_indicacion_medica: medicacion.id_indicacion_medica,
                    horario_programado: medicacion.horario_programado,
                    cantidad_administrada
                })
            }
        );

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(
                resultado.mensaje || "No se pudo administrar la medicación"
            );
        }

        mensaje.value = resultado.mensaje;

        delete cantidades_administradas.value[clave];

        await cargarMedicaciones();

    } catch (error) {
        mensaje.value = error instanceof Error
            ? error.message
            : "Error al administrar la medicación";
    } finally {
        administrando.value = null;
    }
}


onMounted(cargarMedicaciones);
</script>

<template>
    <div class="page">
        <RouterLink to="/enfermeria" class="back-button">
            ← Volver al panel
        </RouterLink>

        <header class="page-header">
            <div>
                <span class="section-label">TRATAMIENTO</span>
                <h1>Administración de medicación</h1>
                <p>
                    Consultá y confirmá las medicaciones prescritas para los pacientes.
                </p>
            </div>

            <div class="pending-counter">
                <strong>{{ pendientes() }}</strong>
                <span>pendientes</span>
            </div>
        </header>

        <button v-if="puede_crear_indicaciones" class="admin-button new-order" @click="mostrar_formulario_indicacion = !mostrar_formulario_indicacion">
            + Nueva indicación
        </button>
        <p v-if="error_opciones_indicacion" class="message error" role="alert">{{ error_opciones_indicacion }}</p>
        <form v-if="puede_crear_indicaciones && mostrar_formulario_indicacion" class="order-form" @submit.prevent="crearIndicacion">
            <label>Paciente internado
                <select v-model="nueva_indicacion.id_paciente" required>
                    <option value="" disabled>Seleccionar paciente</option>
                    <option v-if="pacientes_internados.length === 0" value="" disabled>No hay pacientes internados disponibles</option>
                    <option v-for="paciente in pacientes_internados" :key="paciente.id" :value="String(paciente.id)">{{ paciente.apellido }}, {{ paciente.nombre }}</option>
                </select>
            </label>
            <label>Medicamento o insumo
                <select v-model="nueva_indicacion.id_insumo" required>
                    <option value="" disabled>Seleccionar insumo</option>
                    <option v-if="insumos.length === 0" value="" disabled>No hay insumos registrados</option>
                    <option v-for="insumo in insumos" :key="insumo.id" :value="String(insumo.id)">{{ insumo.nombre }}</option>
                </select>
            </label>
            <label>Cantidad<input v-model="nueva_indicacion.cantidad" type="number" min="1" step="1" required /></label>
            <label>Fecha de inicio<input v-model="nueva_indicacion.fecha" type="date" required /></label>
            <label>Hora de inicio<input v-model="nueva_indicacion.hora_inicio" type="time" required /></label>
            <label>Frecuencia (horas)<input v-model="nueva_indicacion.frecuencia_horas" type="number" min="1" step="1" required /></label>
            <button class="admin-button" type="submit">Guardar indicación</button>
        </form>

        <p v-if="mensaje" class="message">
            {{ mensaje }}
        </p>

        <p v-if="cargando" class="message">
            Cargando medicaciones...
        </p>

        <section v-else class="medication-list">
            <p v-if="medicaciones.length === 0" class="empty-message">
                No hay medicaciones indicadas para pacientes internados.
            </p>

            <article
                v-for="paciente in medicaciones_agrupadas"
                :key="paciente.id"
                class="patient-group"
            >
                <header class="patient">
                    <div class="avatar">{{ paciente.nombre.charAt(0) }}</div>
                    <div>
                        <strong>{{ paciente.nombre }} {{ paciente.apellido }}</strong>
                        <span>Habitación {{ paciente.habitacion }}</span>
                    </div>
                </header>

                <section
                    v-for="indicacion in paciente.indicaciones"
                    :key="indicacion.id"
                    class="indication-group"
                >
                    <div class="medication-info">
                        <span class="label">MEDICACIÓN</span>
                        <strong>{{ indicacion.medicamento }}</strong>
                        <span>Cantidad indicada: {{ indicacion.cantidad }}</span>
                    </div>

                    <ul class="dose-list">
                        <li
                            v-for="medicacion in indicacion.dosis"
                            :key="obtenerClave(medicacion)"
                            class="dose-row"
                        >
                            <div class="dose-schedule">
                                <strong>{{ obtenerFecha(medicacion) }} – {{ obtenerHorario(medicacion) }}</strong>
                                <span class="dose-status" :class="medicacion.estado.toLowerCase()">
                                    {{ medicacion.estado === 'Futura' ? 'Programada' : medicacion.estado }}
                                </span>
                            </div>

                            <div
                                v-if="medicacion.estado === 'Pendiente' && puede_administrar"
                                class="dose-actions"
                            >
                                <label :for="`cantidad-${obtenerClave(medicacion)}`">
                                    Cantidad realmente administrada
                                </label>
                                <input
                                    :id="`cantidad-${obtenerClave(medicacion)}`"
                                    v-model="cantidades_administradas[obtenerClave(medicacion)]"
                                    type="number"
                                    min="1"
                                    :max="medicacion.cantidad"
                                    step="1"
                                    placeholder="Ingresar cantidad"
                                    :disabled="administrando !== null"
                                />
                                <button
                                    class="admin-button"
                                    :disabled="administrando !== null"
                                    @click="administrarMedicacion(medicacion)"
                                >
                                    {{ administrando === obtenerClave(medicacion) ? 'Registrando...' : 'Administrar' }}
                                </button>
                            </div>
                            <span v-else-if="medicacion.estado === 'Administrada'" class="completed-text">
                                Registrada
                            </span>
                        </li>
                    </ul>
                </section>
            </article>
        </section>

        <section class="info-box">
            <strong>Registro de administración</strong>
            <p>
                Al confirmar una medicación, el sistema registra la acción
                asociada al enfermero y descuenta la cantidad correspondiente
                del inventario.
            </p>
        </section>

        <section class="history-section">
            <h2>Historial de administraciones</h2>
            <p v-if="historial.length === 0" class="empty-message">Todavía no hay administraciones registradas.</p>
            <div v-for="registro in historial" :key="registro.id" class="history-row">
                <span>{{ registro.nombre }} {{ registro.apellido }}</span>
                <span>{{ registro.medicamento }} · {{ registro.cantidad }}</span>
                <span>{{ new Date(registro.fecha_hora).toLocaleString('es-AR') }}</span>
                <span>Enfermero/a: {{ registro.enfermero }}</span>
            </div>
        </section>
    </div>
</template>

<style scoped>
.order-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin: 16px 0; padding: 18px; background: white; border: 1px solid #e5ebf1; border-radius: 10px; }
.order-form label { display: flex; flex-direction: column; gap: 6px; color: #526879; font-size: 12px; }
.order-form input, .order-form select { padding: 9px; border: 1px solid #dce5eb; border-radius: 7px; }
.new-order { margin-bottom: 14px; }
.history-section { margin-top: 28px; }
.history-section h2 { color: #163247; font-size: 20px; }
.history-row { display: flex; flex-wrap: wrap; gap: 16px; padding: 12px; margin-bottom: 8px; background: white; border: 1px solid #e5ebf1; border-radius: 8px; color: #526879; font-size: 12px; }
.quantity-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 12px;
}

.quantity-field label {
    color: #526879;
    font-size: 11px;
    font-weight: 600;
}

.quantity-field input {
    width: 100%;
    padding: 9px;
    border: 1px solid #dce5eb;
    border-radius: 7px;
    font-size: 12px;
    outline: none;
}

.quantity-field input:focus {
    border-color: #087fc4;
}
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
    margin: 20px 0 28px;
}

.section-label,
.label {
    color: #087fc4;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.2px;
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

.pending-counter {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 13px 22px;
    border: 1px solid #e5ebf1;
    border-radius: 10px;
    background: white;
}

.pending-counter strong {
    color: #d38a17;
    font-size: 23px;
}

.pending-counter span {
    color: #718496;
    font-size: 11px;
}

.medication-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.patient-group {
    padding: 22px;
    background: white;
    border: 1px solid #e5ebf1;
    border-radius: 11px;
}

.patient-group > .patient {
    padding-bottom: 16px;
    border-bottom: 1px solid #e5ebf1;
}

.indication-group {
    padding-top: 16px;
}

.dose-list {
    padding: 0;
    margin: 10px 0 0;
    list-style: none;
}

.dose-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 12px 0;
    border-top: 1px solid #eef2f5;
}

.dose-schedule {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    color: #263f51;
    font-size: 13px;
}

.dose-status {
    display: inline-block;
    padding: 6px 9px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
}

.dose-status.administrada {
    background: #e8f7ef;
    color: #238452;
}

.dose-status.pendiente {
    background: #fff5df;
    color: #ad7114;
}

.dose-status.futura {
    background: #eaf2fb;
    color: #416b94;
}

.dose-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
}

.dose-actions label {
    color: #526879;
    font-size: 11px;
}

.dose-actions input {
    width: 130px;
    padding: 8px;
    border: 1px solid #dce5eb;
    border-radius: 7px;
}

.patient {
    display: flex;
    align-items: center;
    gap: 12px;
}

.avatar {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #e7f5fd;
    color: #087fc4;
    font-weight: 700;
}

.patient strong,
.medication-info strong,
.schedule strong {
    display: block;
    color: #263f51;
}

.patient span,
.medication-info > span:last-child,
.schedule > span:last-child {
    display: block;
    margin-top: 5px;
    color: #718496;
    font-size: 12px;
}

.medication-info strong,
.schedule strong {
    margin-top: 5px;
}

.admin-button {
    padding: 9px 13px;
    border: none;
    border-radius: 7px;
    background: #087fc4;
    color: white;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
}

.admin-button:hover {
    background: #066da8;
}

.admin-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.completed-text {
    color: #238452;
    font-size: 11px;
    font-weight: 600;
}

.message,
.empty-message {
    margin: 15px 0;
    color: #526879;
    font-size: 13px;
}

.info-box {
    margin-top: 22px;
    padding: 16px;
    border-radius: 9px;
    background: #f1f7fb;
}

.info-box strong {
    color: #087fc4;
    font-size: 12px;
}

.info-box p {
    margin: 5px 0 0;
    color: #718496;
    font-size: 11px;
    line-height: 1.5;
}

@media (max-width: 1000px) {
    .page {
        padding: 24px;
    }

    .dose-actions {
        width: 100%;
    }
}
</style>
