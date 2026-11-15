<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import CamaCard from '../components/CamaCard.vue'
import AsignarCamaForm from '../components/AsignarCamaForm.vue'
import TransicionCamaForm from '../components/TransicionCamaForm.vue'
import RecursosCamasNav from '../components/RecursosCamasNav.vue'
import { crearCamasApi, ErrorCamasApi } from '../services/camasApi'
import type { Cama, CamasApi, EstadoCama, AccionCama, SolicitudTransicion } from '../types/camas'

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

<style scoped src="../styles/recursos-camas.css"></style>
