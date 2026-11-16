<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import CamaCard from '../components/CamaCard.vue'
import AsignarCamaForm from '../components/AsignarCamaForm.vue'
import TransicionCamaForm from '../components/TransicionCamaForm.vue'
import RecursosCamasNav from '../components/RecursosCamasNav.vue'
import { crearCamasApi, ErrorCamasApi } from '../services/recursosCamasApi'
import type {
  Cama,
  CamasApi,
  EstadoCama,
  AccionCama,
  SolicitudTransicion,
} from '../services/recursosCamasApi'

const props = defineProps<{ api?: CamasApi }>()
const api = props.api ?? crearCamasApi()
const camas = ref<Cama[]>([])
const cargando = ref(false)
const enviando = ref(false)
const mapaVigente = ref(false)
const error = ref('')
const aviso = ref('')
const seleccion = ref<{ cama: Cama; accion: 'asignar' | AccionCama } | null>(null)
const estado = ref<EstadoCama | ''>('')
const piso = ref('')
const estados: EstadoCama[] = ['Libre', 'Ocupada', 'En limpieza', 'Bloqueada']
const pisos = computed(() => [...new Set(camas.value.map((c) => c.piso))].sort((a, b) => a - b))
const filtradas = computed(() =>
  camas.value.filter(
    (c) =>
      (!estado.value || c.estado === estado.value) &&
      (piso.value === '' || c.piso === Number(piso.value)),
  ),
)

async function cargar(): Promise<boolean> {
  cargando.value = true
  mapaVigente.value = false
  try {
    camas.value = await api.listar()
    mapaVigente.value = true
    return true
  } catch (causa) {
    error.value = causa instanceof Error ? causa.message : 'No se pudo cargar el mapa de camas.'
    return false
  } finally {
    cargando.value = false
  }
}

async function actualizar() {
  error.value = ''
  seleccion.value = null
  await cargar()
}

function seleccionar(cama: Cama, accion: 'asignar' | AccionCama) {
  seleccion.value = { cama, accion }
}

async function ejecutarOperacion(operacion: () => Promise<string>) {
  if (enviando.value || !mapaVigente.value) return
  enviando.value = true
  error.value = ''
  aviso.value = ''
  try {
    aviso.value = await operacion()
    seleccion.value = null
    if (!(await cargar()))
      aviso.value += ' La operación se confirmó, pero no se pudo actualizar el mapa.'
  } catch (causa) {
    const mensaje = causa instanceof Error ? causa.message : 'No se pudo confirmar la operación.'
    seleccion.value = null
    // Ante respuesta perdida no repetir automáticamente un POST sin idempotencia durable.
    await cargar()
    error.value =
      causa instanceof ErrorCamasApi && causa.status === 409
        ? `${mensaje} Revisá el estado actualizado antes de seleccionar otra operación.`
        : `${mensaje} Verificá el mapa antes de volver a intentar.`
  } finally {
    enviando.value = false
  }
}

async function asignar(idPaciente: number) {
  if (!seleccion.value || seleccion.value.accion !== 'asignar') return
  const cama = seleccion.value.cama
  await ejecutarOperacion(async () => {
    const resultado = await api.asignar(cama.id, idPaciente)
    return `Cama ${resultado.idCama} asignada al paciente ${resultado.idPaciente}.`
  })
}

async function transicionar(solicitud: SolicitudTransicion) {
  const operacion = seleccion.value
  if (!operacion || operacion.accion === 'asignar') return
  await ejecutarOperacion(async () => {
    const resultado = await api.transicionar(operacion.cama.id, solicitud)
    return `Cama ${resultado.idCama}: ${resultado.estadoAnterior} → ${resultado.estado}.`
  })
}

onMounted(cargar)
</script>

<template>
  <div class="recursos-camas gestion-camas">
    <RecursosCamasNav />
    <header class="page-header">
      <div>
        <span class="section-label">RECURSOS Y CAMAS</span>
        <h1>Mapa de camas</h1>
        <p>Disponibilidad, asignación y preparación de las camas del hospital.</p>
      </div>
      <button class="primary-button" :disabled="cargando || enviando" @click="actualizar">
        Actualizar mapa
      </button>
    </header>
    <div class="content">
      <p v-if="error" role="alert" class="message error">{{ error }}</p>
      <p v-if="aviso" role="status" class="message exito">{{ aviso }}</p>
      <div class="filtros toolbar">
        <label class="filter"
          >Estado
          <select v-model="estado">
            <option value="">Todos</option>
            <option v-for="opcion in estados" :key="opcion">{{ opcion }}</option>
          </select></label
        >
        <label class="filter"
          >Piso
          <select v-model="piso">
            <option value="">Todos</option>
            <option v-for="opcion in pisos" :key="opcion" :value="String(opcion)">
              {{ opcion }}
            </option>
          </select></label
        >
      </div>
      <p v-if="cargando" role="status" class="loading">Cargando camas…</p>
      <AsignarCamaForm
        v-if="seleccion && seleccion.accion === 'asignar'"
        :key="seleccion.cama.id"
        :cama="seleccion.cama"
        :enviando="enviando"
        :buscar-paciente="api.buscarPacientePorDni"
        @confirmar="asignar"
        @cancelar="seleccion = null"
      />
      <TransicionCamaForm
        v-if="seleccion && seleccion.accion !== 'asignar'"
        :key="`${seleccion.cama.id}-${seleccion.accion}`"
        :cama="seleccion.cama"
        :accion="seleccion.accion"
        :enviando="enviando"
        @confirmar="transicionar"
        @cancelar="seleccion = null"
      />
      <div class="mapa" :aria-busy="cargando">
        <CamaCard
          v-for="cama in filtradas"
          :key="cama.id"
          :cama="cama"
          :deshabilitada="cargando || enviando || !mapaVigente"
          @asignar="seleccionar($event, 'asignar')"
          @transicionar="seleccionar"
        />
      </div>
      <p v-if="!cargando && mapaVigente && !filtradas.length" class="empty">
        No hay camas para los filtros seleccionados.
      </p>
    </div>
  </div>
</template>

<style scoped>
.recursos-camas {
  min-width: 0;
  min-height: 100vh;
  background: #f5f8fc;
  color: #102a43;
  font-family:
    Inter,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
  font-size: 13px;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 20px;
  padding: 28px 42px;
  background: white;
  border-bottom: 1px solid #e3eaf2;
}
.section-label {
  color: #087fc4;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.4px;
}
h1 {
  margin: 7px 0;
  color: #163247;
  font-size: 28px;
}
.page-header p {
  margin: 0;
  color: #718496;
  font-size: 12px;
  line-height: 1.6;
}
.content {
  max-width: 1500px;
  padding: 28px 42px;
  margin: 0 auto;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 18px;
  padding: 18px 20px;
  margin-bottom: 22px;
  background: white;
  border: 1px solid #e5ebf1;
  border-radius: 10px;
}
.filter {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  color: #526879;
  font-size: 12px;
  font-weight: 600;
}
select {
  box-sizing: border-box;
  max-width: 100%;
  padding: 10px 12px;
  border: 1px solid #dce5eb;
  border-radius: 7px;
  background: white;
  color: #20394b;
  font: inherit;
}
button {
  box-sizing: border-box;
  padding: 11px 18px;
  border: 1px solid transparent;
  border-radius: 8px;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.primary-button {
  background: #087fc4;
  color: white;
  box-shadow: 0 3px 8px rgb(8 127 196 / 12%);
}
.primary-button:hover:not(:disabled) {
  background: #066eac;
}
button:disabled {
  background: #e8eef3;
  color: #718496;
  cursor: default;
  box-shadow: none;
}
button:focus-visible,
select:focus-visible {
  outline: 2px solid #087fc4;
  outline-offset: 3px;
}
.mapa {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 290px), 1fr));
  gap: 20px;
}
.message {
  padding: 14px 18px;
  margin: 0 0 20px;
  border: 1px solid transparent;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.error {
  background: #fff0f0;
  color: #b52e2e;
  border-color: #f4cccc;
}
.exito,
.resultado {
  background: #e8f7ef;
  color: #238452;
  border-color: #c8e8d5;
}
.loading {
  padding: 14px 0;
  color: #60758a;
}
.empty {
  padding: 32px 20px;
  text-align: center;
  color: #718496;
  background: white;
  border: 1px dashed #dce5eb;
  border-radius: 10px;
}
.tabla {
  max-width: 100%;
  overflow-x: auto;
  background: white;
  border: 1px solid #e5ebf1;
  border-radius: 12px;
  box-shadow: 0 3px 12px rgb(16 42 67 / 3%);
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
caption {
  padding: 18px 20px;
  color: #20394b;
  text-align: left;
  font-size: 14px;
  font-weight: 600;
}
th,
td {
  padding: 15px 20px;
  border-bottom: 1px solid #e5ebf1;
  text-align: left;
}
th {
  background: #f7fafc;
  color: #718496;
  font-size: 11px;
  font-weight: 600;
}
td {
  color: #20394b;
}
tbody tr:last-child td {
  border-bottom: 0;
}
td:nth-child(2) {
  min-width: 140px;
  font-weight: 600;
}
.agotado {
  color: #b52e2e;
  font-weight: 600;
}
.stock-agotado {
  display: inline-block;
  padding: 4px 7px;
  margin-left: 6px;
  border-radius: 6px;
  background: #fff0f0;
  font-size: 11px;
  white-space: nowrap;
}
@media (max-width: 900px) {
  .page-header,
  .content {
    padding: 24px;
  }
}
@media (max-width: 600px) {
  .page-header,
  .content {
    padding: 20px 12px;
  }
  h1 {
    font-size: 23px;
  }
  .page-header > div,
  .page-header > button,
  .filter,
  .filter select {
    width: 100%;
  }
  .toolbar {
    padding: 16px;
    gap: 14px;
  }
  .filter {
    align-items: stretch;
    flex-direction: column;
  }
  th,
  td {
    padding: 12px;
  }
}
</style>
