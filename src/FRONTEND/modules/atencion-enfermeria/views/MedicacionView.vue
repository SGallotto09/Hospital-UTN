

<script setup lang="ts">
import { ref, onMounted } from "vue";

interface DosisProgramada {
    id_indicacion_medica: number;
    id_paciente: number;
    nombre: string;
    apellido: string;
    habitacion: number;
    medicamento: string;
    cantidad: number;
    horario_programado: string;
    estado: "Pendiente" | "Administrada";
}

const medicaciones = ref<DosisProgramada[]>([]);
const mensaje = ref("");
const cargando = ref(false);
const administrando = ref<string | null>(null);
const cantidades_administradas = ref<Record<string, string>>({});

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
    } catch (error) {
        mensaje.value = error instanceof Error
            ? error.message
            : "Error al cargar las medicaciones";
    } finally {
        cargando.value = false;
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
        !Number.isFinite(cantidad_administrada) ||
        cantidad_administrada <= 0
    ) {
        mensaje.value = "Ingresá una cantidad administrada válida";
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
                v-for="medicacion in medicaciones"
                :key="obtenerClave(medicacion)"
                class="medication-card"
                :class="{
                    completed: medicacion.estado === 'Administrada'
                }"
            >
                <div class="patient">
                    <div class="avatar">
                        {{ medicacion.nombre.charAt(0) }}
                    </div>

                    <div>
                        <strong>
                            {{ medicacion.nombre }} {{ medicacion.apellido }}
                        </strong>
                        <span>Habitación {{ medicacion.habitacion }}</span>
                    </div>
                </div>

                <div class="medication-info">
                    <span class="label">MEDICACIÓN</span>
                    <strong>{{ medicacion.medicamento }}</strong>
                    <span>Cantidad indicada: {{ medicacion.cantidad }}</span>

                <div
                    v-if="medicacion.estado === 'Pendiente'"
                    class="quantity-field"
                >
                    <label :for="`cantidad-${obtenerClave(medicacion)}`">
                        Cantidad realmente administrada
                    </label>

                    <input
                        :id="`cantidad-${obtenerClave(medicacion)}`"
                        v-model="cantidades_administradas[obtenerClave(medicacion)]"
                        type="number"
                        min="0.01"
                        step="any"
                        placeholder="Ingresar cantidad"
                        :disabled="administrando !== null"
                    />
                </div>
            </div>

                <div class="schedule">
                    <span class="label">HORARIO PROGRAMADO</span>
                    <strong>{{ obtenerHorario(medicacion) }}</strong>
                    <span>{{ obtenerFecha(medicacion) }}</span>
                </div>

                <div class="status">
                    <span
                        :class="{
                            done: medicacion.estado === 'Administrada',
                            pending: medicacion.estado === 'Pendiente'
                        }"
                    >
                        {{
                            medicacion.estado === "Administrada"
                                ? "✓ Administrada"
                                : "Pendiente"
                        }}
                    </span>
                </div>

                <button
                    v-if="medicacion.estado === 'Pendiente'"
                    class="admin-button"
                    :disabled="administrando !== null"
                    @click="administrarMedicacion(medicacion)"
                >
                    {{
                        administrando === obtenerClave(medicacion)
                            ? "Registrando..."
                            : "Administrar"
                    }}
                </button>

                <span v-else class="completed-text">
                    Registrada
                </span>
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
    </div>
</template>

<style scoped>
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

.medication-card {
    display: grid;
    grid-template-columns: 1.5fr 1.3fr 1fr 1fr auto;
    align-items: center;
    gap: 20px;
    padding: 20px;
    background: white;
    border: 1px solid #e5ebf1;
    border-radius: 11px;
}

.medication-card.completed {
    opacity: 0.7;
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

.status span {
    display: inline-block;
    padding: 6px 9px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
}

.status .done {
    background: #e8f7ef;
    color: #238452;
}

.status .pending {
    background: #fff5df;
    color: #ad7114;
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

    .medication-card {
        grid-template-columns: 1fr;
    }
}
</style>
