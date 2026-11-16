<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'

interface Paciente {
  id: number
  nombre: string
  apellido: string
  dni: string
  fechaNacimiento: string
  genero: string
  telefono: string
  email: string
  obraSocial: string
}

const pacientes = ref<Paciente[]>([])

const busqueda = ref('')
const filtroCobertura = ref('todas')
const mostrarFormulario = ref(false)
const mensaje = ref('')
const error = ref('')

const nuevoPaciente = reactive({
  nombre: '',
  apellido: '',
  dni: '',
  fechaNacimiento: '',
  genero: '',
  telefono: '',
  email: '',
  obraSocial: 'Particular',
})

const pacientesFiltrados = computed(() => {
  return pacientes.value.filter((paciente) => {
    const texto = busqueda.value.toLowerCase().trim()

    const coincideBusqueda =
      `${paciente.nombre} ${paciente.apellido}`.toLowerCase().includes(texto) ||
      paciente.dni.includes(texto)

    const coincideCobertura =
      filtroCobertura.value === 'todas' || paciente.obraSocial === filtroCobertura.value

    return coincideBusqueda && coincideCobertura
  })
})

const totalPacientes = computed(() => pacientes.value.length)

const pacientesConCobertura = computed(
  () => pacientes.value.filter((paciente) => paciente.obraSocial !== 'Particular').length,
)

function obtenerEdad(fechaNacimiento: string): number {
  const nacimiento = new Date(`${fechaNacimiento}T00:00:00`)
  const hoy = new Date()

  let edad = hoy.getFullYear() - nacimiento.getFullYear()

  const noCumplioAnios =
    hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate())

  if (noCumplioAnios) edad--

  return edad
}

function limpiarFormulario() {
  nuevoPaciente.nombre = ''
  nuevoPaciente.apellido = ''
  nuevoPaciente.dni = ''
  nuevoPaciente.fechaNacimiento = ''
  nuevoPaciente.genero = ''
  nuevoPaciente.telefono = ''
  nuevoPaciente.email = ''
  nuevoPaciente.obraSocial = 'Particular'
}

function mapearPaciente(p: Record<string, unknown>): Paciente {
  return {
    id: Number(p.id),
    nombre: String(p.nombre),
    apellido: String(p.apellido),
    dni: String(p.dni),
    fechaNacimiento: String(p.fecha_nacimiento).slice(0, 10),
    genero: String(p.genero),
    telefono: String(p.telefono),
    email: String(p.email),
    obraSocial: String(p.cobertura_nombre ?? p.obra_social),
  }
}

async function cargarPacientes() {
  try {
    const respuesta = await fetch('/api/pacientes')
    if (!respuesta.ok) throw new Error('No se pudo cargar el listado de pacientes.')
    pacientes.value = (await respuesta.json()).map(mapearPaciente)
  } catch (e) {
    pacientes.value = []
    error.value = e instanceof Error ? e.message : 'Error al cargar pacientes.'
  }
}

onMounted(cargarPacientes)

async function registrarPaciente() {
  error.value = ''
  mensaje.value = ''

  try {
    const respuesta = await fetch('/api/pacientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...nuevoPaciente }),
    })
    const cuerpo = await respuesta.json()
    if (!respuesta.ok) throw new Error(cuerpo.mensaje ?? 'No se pudo registrar el paciente.')
    pacientes.value.push(mapearPaciente(cuerpo))
    limpiarFormulario()
    mostrarFormulario.value = false
    mensaje.value = 'El paciente fue registrado correctamente.'
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al registrar el paciente.'
  }
}
</script>

<template>
  <section class="pacientes-view">
    <header class="page-header">
      <div>
        <span class="eyebrow">ADMISIÓN Y TURNOS</span>
        <h1>Pacientes</h1>
        <p>Consultá y administrá los pacientes registrados en el hospital.</p>
      </div>

      <button class="btn-primary" @click="mostrarFormulario = true">
        <span class="plus-icon">+</span>
        Nuevo paciente
      </button>
    </header>

    <div v-if="mensaje" class="feedback success">
      {{ mensaje }}
      <button @click="mensaje = ''">×</button>
    </div>

    <div class="summary-grid">
      <article class="summary-card">
        <div class="summary-icon blue">♙</div>
        <div>
          <span class="summary-label">Total de pacientes</span>
          <strong>{{ totalPacientes }}</strong>
          <small>Pacientes registrados</small>
        </div>
      </article>

      <article class="summary-card">
        <div class="summary-icon green">✓</div>
        <div>
          <span class="summary-label">Con cobertura médica</span>
          <strong>{{ pacientesConCobertura }}</strong>
          <small>Obra social o prepaga</small>
        </div>
      </article>

      <article class="summary-card">
        <div class="summary-icon orange">＋</div>
        <div>
          <span class="summary-label">Atención particular</span>
          <strong>{{ totalPacientes - pacientesConCobertura }}</strong>
          <small>Sin cobertura registrada</small>
        </div>
      </article>
    </div>

    <section class="table-section">
      <div class="section-heading">
        <div>
          <h2>Listado de pacientes</h2>
          <p>Encontrá rápidamente la información de cada paciente.</p>
        </div>

        <span class="result-count"> {{ pacientesFiltrados.length }} resultados </span>
      </div>

      <div class="filters">
        <div class="search-box">
          <span>⌕</span>
          <input
            v-model="busqueda"
            type="text"
            placeholder="Buscar por nombre, apellido o DNI..."
          />
        </div>

        <select v-model="filtroCobertura" aria-label="Filtrar por cobertura">
          <option value="todas">Todas las coberturas</option>
          <option value="OSDE">OSDE</option>
          <option value="APROSS">APROSS</option>
          <option value="PAMI">PAMI</option>
          <option value="Particular">Particular</option>
        </select>
      </div>

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
            <tr v-for="paciente in pacientesFiltrados" :key="paciente.id">
              <td>
                <div class="patient-cell">
                  <div class="avatar">
                    {{ paciente.nombre.charAt(0) }}{{ paciente.apellido.charAt(0) }}
                  </div>
                  <div>
                    <strong>{{ paciente.apellido }}, {{ paciente.nombre }}</strong>
                    <small>{{ paciente.genero }}</small>
                  </div>
                </div>
              </td>

              <td>{{ paciente.dni }}</td>
              <td>{{ obtenerEdad(paciente.fechaNacimiento) }} años</td>
              <td>{{ paciente.telefono }}</td>
              <td>
                <span
                  class="coverage-badge"
                  :class="{ particular: paciente.obraSocial === 'Particular' }"
                >
                  {{ paciente.obraSocial }}
                </span>
              </td>
              <td>
                <a class="email-link" :href="`mailto:${paciente.email}`"> Enviar email </a>
              </td>
            </tr>

            <tr v-if="pacientesFiltrados.length === 0">
              <td colspan="6" class="empty-state">
                No se encontraron pacientes con esos criterios.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="mostrarFormulario" class="modal-overlay" @click.self="mostrarFormulario = false">
      <section class="modal">
        <header class="modal-header">
          <div>
            <span class="eyebrow">ADMISIÓN</span>
            <h2>Registrar paciente</h2>
            <p>Completá los datos personales del nuevo paciente.</p>
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

        <form class="patient-form" @submit.prevent="registrarPaciente">
          <div class="form-grid">
            <label>
              Nombre
              <input v-model="nuevoPaciente.nombre" required maxlength="45" />
            </label>

            <label>
              Apellido
              <input v-model="nuevoPaciente.apellido" required maxlength="45" />
            </label>

            <label>
              DNI
              <input v-model="nuevoPaciente.dni" required maxlength="45" inputmode="numeric" />
            </label>

            <label>
              Fecha de nacimiento
              <input v-model="nuevoPaciente.fechaNacimiento" type="date" required />
            </label>

            <label>
              Género
              <select v-model="nuevoPaciente.genero" required>
                <option value="" disabled>Seleccionar</option>
                <option>Femenino</option>
                <option>Masculino</option>
                <option>Otro</option>
              </select>
            </label>

            <label>
              Teléfono
              <input v-model="nuevoPaciente.telefono" required maxlength="45" type="tel" />
            </label>

            <label class="full-width">
              Correo electrónico
              <input v-model="nuevoPaciente.email" type="email" required maxlength="45" />
            </label>

            <label class="full-width">
              Cobertura médica
              <select v-model="nuevoPaciente.obraSocial" required>
                <option>OSDE</option>
                <option>APROSS</option>
                <option>PAMI</option>
                <option>Particular</option>
              </select>
            </label>
          </div>

          <p v-if="error" class="feedback error">{{ error }}</p>

          <footer class="modal-actions">
            <button class="btn-secondary" type="button" @click="mostrarFormulario = false">
              Cancelar
            </button>

            <button class="btn-primary" type="submit">Registrar paciente</button>
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

.btn-primary:hover {
  background: #066da9;
}

.plus-icon {
  font-size: 19px;
  line-height: 12px;
}

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

.feedback {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 18px;
  padding: 12px 15px;
  border-radius: 8px;
  font-size: 13px;
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
