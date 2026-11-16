<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import HistoriaClinicaNav from '../components/historia_clinica_nav.vue'

interface Paciente {
  id: number
  nombre: string
  apellido: string
  dni: string
  fechaNacimiento: string
  sexo: string
  domicilio: string
  telefono: string
  obraSocial: string
  numeroAfiliado: string
  numeroHistoria: string
}
interface Alergia {
  id: number
  pacienteId: number
  sustancia: string
  reaccion: string
  gravedad: 'Leve' | 'Moderada' | 'Grave'
  fecha: string
  autor: string
  estado: 'Activa' | 'Descartada'
}
interface Antecedente {
  id: number
  pacienteId: number
  parentesco: string
  condicion: string
  observaciones: string
  fecha: string
  autor: string
}
interface Evolucion {
  id: number
  pacienteId: number
  tipo: string
  descripcion: string
  fecha: string
  autor: string
}
interface Estudio {
  id: number
  pacienteId: number
  tipo: string
  fecha: string
  resultado: string
}

const pacientes = ref<Paciente[]>([])
const buscador = ref('')
const pacienteSeleccionadoId = ref<number | null>(null)
const pacienteSeleccionado = computed(
  () => pacientes.value.find((p) => p.id === pacienteSeleccionadoId.value) ?? null,
)
const pacientesFiltrados = computed(() => {
  const texto = buscador.value.toLowerCase().trim()
  if (!texto) return pacientes.value
  return pacientes.value.filter(
    (p) =>
      `${p.nombre} ${p.apellido}`.toLowerCase().includes(texto) ||
      p.dni.includes(texto) ||
      p.numeroHistoria.toLowerCase().includes(texto),
  )
})
const alergias = ref<Alergia[]>([])
const antecedentes = ref<Antecedente[]>([])
const evoluciones = ref<Evolucion[]>([])
const estudios = ref<Estudio[]>([])
const alergiasPaciente = computed(() =>
  alergias.value.filter((a) => a.pacienteId === pacienteSeleccionadoId.value),
)
const antecedentesPaciente = computed(() =>
  antecedentes.value
    .filter((a) => a.pacienteId === pacienteSeleccionadoId.value)
    .sort((a, b) => b.id - a.id),
)
const evolucionesPaciente = computed(() =>
  evoluciones.value
    .filter((e) => e.pacienteId === pacienteSeleccionadoId.value)
    .sort((a, b) => b.id - a.id),
)
const estudiosPaciente = computed(() =>
  estudios.value.filter((e) => e.pacienteId === pacienteSeleccionadoId.value),
)
const nuevaAlergia = ref({ sustancia: '', reaccion: '', gravedad: 'Leve' as Alergia['gravedad'] })
const nuevoAntecedente = ref({ parentesco: '', condicion: '', observaciones: '' })
const nuevaEvolucion = ref({ tipo: 'Consulta médica', descripcion: '' })

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const respuesta = await fetch(url, { credentials: 'same-origin', ...init })
  const cuerpo = await respuesta.json()
  if (!respuesta.ok) throw new Error(cuerpo?.mensaje ?? `Error HTTP ${respuesta.status}`)
  return cuerpo as T
}
function fechaVisible(valor: unknown): string {
  const texto = String(valor ?? '')
  const fecha = new Date(texto.includes('T') ? texto : texto.replace(' ', 'T'))
  return Number.isNaN(fecha.getTime()) ? texto : fecha.toLocaleString('es-AR')
}
function etiqueta(valor: unknown): string {
  const texto = String(valor ?? '')
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase() : ''
}
function mapearPaciente(p: Record<string, unknown>): Paciente {
  const id = Number(p.id)
  return {
    id,
    nombre: String(p.nombre ?? ''),
    apellido: String(p.apellido ?? ''),
    dni: String(p.dni ?? ''),
    fechaNacimiento: String(p.fecha_nacimiento ?? '').slice(0, 10),
    sexo: String(p.genero ?? '—'),
    domicilio: '—',
    telefono: String(p.telefono ?? '—'),
    obraSocial: String(p.cobertura_nombre ?? p.obra_social ?? '—'),
    numeroAfiliado: '—',
    numeroHistoria: `HC-${String(id).padStart(4, '0')}`,
  }
}
function mapearAlergia(a: Record<string, unknown>): Alergia {
  return {
    id: Number(a.id),
    pacienteId: Number(a.id_paciente),
    sustancia: String(a.sustancia),
    reaccion: String(a.reaccion),
    gravedad: etiqueta(a.gravedad) as Alergia['gravedad'],
    fecha: fechaVisible(a.fecha_deteccion ?? a.fecha_registro),
    autor: `Profesional #${String(a.id_medico)}`,
    estado: etiqueta(a.estado) as Alergia['estado'],
  }
}
function mapearAntecedente(a: Record<string, unknown>): Antecedente {
  return {
    id: Number(a.id),
    pacienteId: Number(a.id_paciente),
    parentesco: String(a.parentesco),
    condicion: String(a.enfermedad),
    observaciones: String(a.observaciones ?? ''),
    fecha: fechaVisible(a.fecha_registro),
    autor: `Profesional #${String(a.id_medico)}`,
  }
}
function mapearEvolucion(e: Record<string, unknown>): Evolucion {
  return {
    id: Number(e.id),
    pacienteId: Number(e.id_paciente),
    tipo: String(e.diagnostico),
    descripcion: String(e.descripcion ?? ''),
    fecha: fechaVisible(e.fecha_registro),
    autor: `Profesional #${String(e.id_medico)}`,
  }
}
function mapearEstudio(e: Record<string, unknown>): Estudio {
  return {
    id: Number(e.id),
    pacienteId: Number(e.id_paciente),
    tipo: String(e.tipo_estudio),
    fecha: fechaVisible(e.fecha_registro),
    resultado: String(e.resultado ?? e.descripcion ?? 'Sin resultado registrado'),
  }
}
async function cargarRegistros(id: number) {
  const [alergiasDb, antecedentesDb, evolucionesDb, estudiosDb] = await Promise.all([
    api<Record<string, unknown>[]>(`/api/alergias/paciente/${id}`),
    api<Record<string, unknown>[]>(`/api/antecedentes-familiares/paciente/${id}`),
    api<Record<string, unknown>[]>(`/api/evoluciones-medicas/paciente/${id}`),
    api<Record<string, unknown>[]>(`/api/historias-clinicas/paciente/${id}/estudios`),
  ])
  alergias.value = alergiasDb.map(mapearAlergia)
  antecedentes.value = antecedentesDb.map(mapearAntecedente)
  evoluciones.value = evolucionesDb.map(mapearEvolucion)
  estudios.value = estudiosDb.map(mapearEstudio)
}
async function cargarPacientes() {
  try {
    pacientes.value = (await api<Record<string, unknown>[]>('/api/pacientes')).map(mapearPaciente)
    pacienteSeleccionadoId.value = pacientes.value[0]?.id ?? null
    if (pacienteSeleccionadoId.value !== null) await cargarRegistros(pacienteSeleccionadoId.value)
  } catch (error) {
    alert(error instanceof Error ? error.message : 'No se pudo cargar la historia clínica.')
  }
}
onMounted(cargarPacientes)
async function seleccionarPaciente(paciente: Paciente) {
  pacienteSeleccionadoId.value = paciente.id
  try {
    await cargarRegistros(paciente.id)
  } catch (error) {
    alert(error instanceof Error ? error.message : 'No se pudo cargar la historia clínica.')
  }
}
function exigirPaciente(): number | null {
  if (pacienteSeleccionadoId.value === null) {
    alert('Seleccioná un paciente primero.')
    return null
  }
  return pacienteSeleccionadoId.value
}
async function registrarAlergia() {
  const idPaciente = exigirPaciente()
  if (idPaciente === null) return
  if (!nuevaAlergia.value.sustancia.trim() || !nuevaAlergia.value.reaccion.trim()) {
    alert('Completá todos los campos de la alergia.')
    return
  }
  try {
    await api('/api/alergias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_paciente: idPaciente,
        sustancia: nuevaAlergia.value.sustancia,
        reaccion: nuevaAlergia.value.reaccion,
        gravedad: nuevaAlergia.value.gravedad.toLowerCase(),
        fecha_deteccion: new Date().toISOString().slice(0, 10),
        estado: 'activa',
      }),
    })
    nuevaAlergia.value = { sustancia: '', reaccion: '', gravedad: 'Leve' }
    await cargarRegistros(idPaciente)
    alert('Alergia registrada correctamente.')
  } catch (error) {
    alert(error instanceof Error ? error.message : 'No se pudo registrar la alergia.')
  }
}
async function descartarAlergia(alergia: Alergia) {
  const idPaciente = exigirPaciente()
  if (idPaciente === null) return
  const motivo = prompt('Ingresá el motivo de la corrección:')
  if (!motivo?.trim()) return
  try {
    await api('/api/alergias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_paciente: idPaciente,
        sustancia: alergia.sustancia,
        reaccion: `Corrección: ${motivo.trim()}`,
        gravedad: alergia.gravedad.toLowerCase(),
        fecha_deteccion: new Date().toISOString().slice(0, 10),
        estado: 'descartada',
      }),
    })
    await cargarRegistros(idPaciente)
    alert('Se registró la corrección de la alergia.')
  } catch (error) {
    alert(error instanceof Error ? error.message : 'No se pudo registrar la corrección.')
  }
}
async function registrarAntecedente() {
  const idPaciente = exigirPaciente()
  if (idPaciente === null) return
  if (!nuevoAntecedente.value.parentesco || !nuevoAntecedente.value.condicion.trim()) {
    alert('Completá el parentesco y la condición.')
    return
  }
  try {
    await api('/api/antecedentes-familiares', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_paciente: idPaciente,
        parentesco: nuevoAntecedente.value.parentesco,
        enfermedad: nuevoAntecedente.value.condicion,
        observaciones: nuevoAntecedente.value.observaciones,
      }),
    })
    nuevoAntecedente.value = { parentesco: '', condicion: '', observaciones: '' }
    await cargarRegistros(idPaciente)
    alert('Antecedente registrado correctamente.')
  } catch (error) {
    alert(error instanceof Error ? error.message : 'No se pudo registrar el antecedente.')
  }
}
async function registrarEvolucion() {
  const idPaciente = exigirPaciente()
  if (idPaciente === null) return
  if (!nuevaEvolucion.value.descripcion.trim()) {
    alert('Ingresá la descripción de la evolución.')
    return
  }
  try {
    await api('/api/evoluciones-medicas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_paciente: idPaciente,
        diagnostico: nuevaEvolucion.value.tipo,
        descripcion: nuevaEvolucion.value.descripcion,
      }),
    })
    nuevaEvolucion.value = { tipo: 'Consulta médica', descripcion: '' }
    await cargarRegistros(idPaciente)
    alert('Evolución médica registrada correctamente.')
  } catch (error) {
    alert(error instanceof Error ? error.message : 'No se pudo registrar la evolución.')
  }
}
</script>

<template>
  <div class="historia-clinica">
    <HistoriaClinicaNav />

    <!-- CABECERA -->
    <header class="topbar">
      <div>
        <span class="breadcrumb"> HISTORIA CLÍNICA ELECTRÓNICA </span>

        <h1>Historia clínica</h1>

        <p>Información médica centralizada de los pacientes.</p>
      </div>

      <div class="module-status">
        <span class="status-dot"></span>
        Sistema de historias clínicas
      </div>
    </header>

    <main class="content">
      <!-- BUSCADOR Y SELECCIÓN -->
      <section class="section-header">
        <div>
          <span class="section-label">PACIENTES</span>
          <h2>Consultar historia clínica</h2>
          <p>Buscá un paciente por nombre, apellido, DNI o número de historia.</p>
        </div>
      </section>

      <section class="search-layout">
        <div class="search-panel">
          <div class="search-box">
            <span>⌕</span>

            <input v-model="buscador" type="text" placeholder="Buscar paciente..." />
          </div>

          <div class="patient-list">
            <p v-if="pacientes.length === 0">
              No hay pacientes registrados en la base. Registrá primero un paciente en Admisiones.
            </p>
            <p v-else-if="pacientesFiltrados.length === 0">
              No se encontraron pacientes con esa búsqueda.
            </p>

            <button
              v-for="paciente in pacientesFiltrados"
              :key="paciente.id"
              class="patient-option"
              :class="{
                selected: pacienteSeleccionadoId === paciente.id,
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

                <span> DNI: {{ paciente.dni }} </span>

                <small>
                  {{ paciente.numeroHistoria }}
                </small>
              </div>

              <span class="arrow">→</span>
            </button>

            <div v-if="pacientesFiltrados.length === 0" class="empty">
              No se encontraron pacientes.
            </div>
          </div>
        </div>

        <!-- FICHA DEMOGRÁFICA -->
        <div v-if="pacienteSeleccionado" id="ficha" class="patient-profile">
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
                {{ pacienteSeleccionado.numeroHistoria }}
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
                {{ pacienteSeleccionado.fechaNacimiento }}
              </strong>
            </div>

            <div class="profile-field">
              <span>Sexo</span>
              <strong>{{ pacienteSeleccionado.sexo }}</strong>
            </div>

            <div class="profile-field">
              <span>Teléfono</span>
              <strong>{{ pacienteSeleccionado.telefono }}</strong>
            </div>

            <div class="profile-field">
              <span>Domicilio</span>
              <strong>{{ pacienteSeleccionado.domicilio }}</strong>
            </div>

            <div class="profile-field">
              <span>Obra social</span>
              <strong>{{ pacienteSeleccionado.obraSocial }}</strong>
            </div>

            <div class="profile-field">
              <span>Número de afiliado</span>
              <strong>
                {{ pacienteSeleccionado.numeroAfiliado }}
              </strong>
            </div>
          </div>
        </div>

        <div v-else class="patient-profile">
          <div class="profile-header">
            <div>
              <span class="card-label">SIN PACIENTES</span>
              <h2>La historia clínica está vacía</h2>
              <p>
                Registrá primero un paciente en Admisiones. Después vas a poder cargar y consultar
                sus datos clínicos.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- ALERGIAS -->
      <section id="alergias" class="clinical-section">
        <div class="section-title">
          <div>
            <span class="section-label">SEGURIDAD DEL PACIENTE</span>
            <h2>Alergias</h2>
            <p>Sustancias y reacciones alérgicas registradas.</p>
          </div>

          <span class="count">
            {{ alergiasPaciente.filter((a) => a.estado === 'Activa').length }}
            activas
          </span>
        </div>

        <div class="clinical-card">
          <div v-if="!pacienteSeleccionado" class="empty">
            Para guardar una alergia, registrá primero un paciente en Admisiones.
          </div>
          <div
            v-if="alergiasPaciente.filter((a) => a.estado === 'Activa').length === 0"
            class="empty"
          >
            No hay alergias activas registradas.
          </div>

          <article
            v-for="alergia in alergiasPaciente"
            :key="alergia.id"
            class="record-row"
            :class="{ inactive: alergia.estado === 'Descartada' }"
          >
            <div class="record-icon allergy-icon">!</div>

            <div class="record-main">
              <div class="record-title">
                <strong>{{ alergia.sustancia }}</strong>

                <span
                  class="status"
                  :class="{
                    active: alergia.estado === 'Activa',
                    discarded: alergia.estado === 'Descartada',
                  }"
                >
                  {{ alergia.estado }}
                </span>
              </div>

              <p>Reacción: {{ alergia.reaccion }}</p>

              <span class="record-meta">
                Gravedad: {{ alergia.gravedad }} · {{ alergia.fecha }} · {{ alergia.autor }}
              </span>
            </div>

            <button
              v-if="alergia.estado === 'Activa'"
              class="secondary-button"
              @click="descartarAlergia(alergia)"
            >
              Corregir
            </button>
          </article>

          <div class="form-divider"></div>

          <h3>Registrar nueva alergia</h3>

          <form @submit.prevent="registrarAlergia">
            <div class="form-grid">
              <div class="form-group">
                <label>Sustancia o agente</label>

                <input
                  v-model="nuevaAlergia.sustancia"
                  type="text"
                  placeholder="Ej. Penicilina"
                  required
                />
              </div>

              <div class="form-group">
                <label>Tipo de reacción</label>

                <input
                  v-model="nuevaAlergia.reaccion"
                  type="text"
                  placeholder="Ej. Erupción cutánea"
                  required
                />
              </div>

              <div class="form-group">
                <label>Gravedad</label>

                <select v-model="nuevaAlergia.gravedad">
                  <option>Leve</option>
                  <option>Moderada</option>
                  <option>Grave</option>
                </select>
              </div>
            </div>

            <div class="form-actions">
              <button class="primary-button" type="submit" :disabled="!pacienteSeleccionado">
                + Registrar alergia
              </button>
            </div>
          </form>
        </div>
      </section>

      <!-- ANTECEDENTES FAMILIARES -->
      <section id="antecedentes" class="clinical-section">
        <div class="section-title">
          <div>
            <span class="section-label">INFORMACIÓN HEREDITARIA</span>
            <h2>Antecedentes familiares</h2>
            <p>Condiciones médicas relevantes de familiares.</p>
          </div>
        </div>

        <div class="clinical-card">
          <div v-if="antecedentesPaciente.length === 0" class="empty">
            No hay antecedentes familiares registrados.
          </div>

          <article
            v-for="antecedente in antecedentesPaciente"
            :key="antecedente.id"
            class="record-row"
          >
            <div class="record-icon family-icon">♧</div>

            <div class="record-main">
              <strong>{{ antecedente.condicion }}</strong>

              <p>Parentesco: {{ antecedente.parentesco }}</p>

              <span class="record-meta">
                {{ antecedente.observaciones || 'Sin observaciones' }}
                · {{ antecedente.fecha }} · {{ antecedente.autor }}
              </span>
            </div>
          </article>

          <div class="form-divider"></div>

          <h3>Registrar antecedente</h3>

          <form @submit.prevent="registrarAntecedente">
            <div class="form-grid">
              <div class="form-group">
                <label>Parentesco</label>

                <select v-model="nuevoAntecedente.parentesco" required>
                  <option value="" disabled>Seleccionar parentesco</option>

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
              <button class="primary-button" type="submit" :disabled="!pacienteSeleccionado">
                + Registrar antecedente
              </button>
            </div>
          </form>
        </div>
      </section>

      <!-- EVOLUCIONES -->
      <section id="evoluciones" class="clinical-section">
        <div class="section-title">
          <div>
            <span class="section-label">SEGUIMIENTO MÉDICO</span>
            <h2>Evoluciones médicas</h2>
            <p>Historial cronológico de las atenciones realizadas.</p>
          </div>

          <span class="count"> {{ evolucionesPaciente.length }} registros </span>
        </div>

        <div class="clinical-card">
          <div v-if="evolucionesPaciente.length === 0" class="empty">
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
                <strong>{{ evolucion.tipo }}</strong>

                <span class="record-meta">
                  {{ evolucion.fecha }}
                </span>
              </div>

              <p>{{ evolucion.descripcion }}</p>

              <span class="record-meta"> Registrado por: {{ evolucion.autor }} </span>

              <span class="immutable"> ✓ Registro clínico inmutable </span>
            </div>
          </article>

          <div class="form-divider"></div>

          <h3>Registrar evolución médica</h3>

          <form @submit.prevent="registrarEvolucion">
            <div class="form-group">
              <label>Tipo de evolución</label>

              <select v-model="nuevaEvolucion.tipo">
                <option>Consulta médica</option>
                <option>Control médico</option>
                <option>Seguimiento</option>
                <option>Observación clínica</option>
              </select>
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
              <button class="primary-button" type="submit" :disabled="!pacienteSeleccionado">
                + Guardar evolución
              </button>
            </div>
          </form>
        </div>
      </section>

      <!-- ESTUDIOS -->
      <section id="estudios" class="clinical-section">
        <div class="section-title">
          <div>
            <span class="section-label">DIAGNÓSTICO</span>
            <h2>Estudios clínicos</h2>
            <p>Estudios realizados y resultados disponibles.</p>
          </div>

          <span class="count"> {{ estudiosPaciente.length }} estudios </span>
        </div>

        <div class="clinical-card">
          <div v-if="estudiosPaciente.length === 0" class="empty">
            No hay estudios clínicos disponibles.
          </div>

          <article v-for="estudio in estudiosPaciente" :key="estudio.id" class="study-row">
            <div class="record-icon study-icon">▣</div>

            <div class="record-main">
              <strong>{{ estudio.tipo }}</strong>

              <span class="record-meta"> Fecha: {{ estudio.fecha }} </span>

              <p>
                {{ estudio.resultado }}
              </p>
            </div>

            <span class="read-only"> Solo lectura </span>
          </article>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.historia-clinica {
  min-height: 100vh;
  background: #f5f8fc;
  color: #102a43;
  font-family:
    Inter,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
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

.secondary-button {
  padding: 8px 12px;
  border: 1px solid #dce5eb;
  border-radius: 7px;
  background: white;
  color: #526879;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
}

.secondary-button:hover {
  border-color: #087fc4;
  color: #087fc4;
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

  .record-row .secondary-button {
    margin-left: 52px;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-group.full {
    grid-column: auto;
  }
}
</style>
