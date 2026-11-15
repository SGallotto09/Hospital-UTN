<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { crearInventarioApi } from '../services/inventarioApi'
import type { Insumo, InventarioApi, ResultadoConsumo } from '../types/inventario'
import RecursosCamasNav from '../components/RecursosCamasNav.vue'

// resultadoConsumo/errorConsumo son entradas para la integración futura de notificaciones.
// No se generan resultados ficticios ni se envían consumos desde esta pantalla.
const props = defineProps<{
  api?: InventarioApi
  resultadoConsumo?: ResultadoConsumo
  errorConsumo?: string
}>()
const api = props.api ?? crearInventarioApi()
const insumos = ref<Insumo[]>([])
const cargando = ref(false)
const error = ref('')
const consultaVigente = ref(false)
const piso = ref('todos')
const pisos = computed(() =>
  [
    ...new Set(
      insumos.value.map((insumo) => insumo.piso).filter((valor): valor is number => valor !== null),
    ),
  ].sort((a, b) => a - b),
)
const filtrados = computed(() =>
  insumos.value.filter(
    (insumo) =>
      piso.value === 'todos' ||
      (piso.value === 'sin-piso' ? insumo.piso === null : insumo.piso === Number(piso.value)),
  ),
)

async function cargar() {
  if (cargando.value) return
  cargando.value = true
  consultaVigente.value = false
  error.value = ''
  try {
    insumos.value = await api.listar()
    consultaVigente.value = true
  } catch (causa) {
    error.value = causa instanceof Error ? causa.message : 'No se pudo consultar el inventario.'
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)
watch(() => props.resultadoConsumo, cargar)
</script>

<template>
  <div class="recursos-camas inventario">
    <RecursosCamasNav />
    <header class="page-header">
      <div>
        <span class="section-label">RECURSOS Y CAMAS</span>
        <h1>Inventario de insumos</h1>
        <p>Consulta de existencias y disponibilidad de insumos por piso.</p>
      </div>
      <button class="primary-button" :disabled="cargando" @click="cargar">
        Actualizar existencias
      </button>
    </header>
    <div class="content">
      <p class="loading">
        Los consumos se registran desde Enfermería. Actualizá las existencias para ver los cambios.
      </p>
      <p v-if="error" role="alert" class="message error">{{ error }}</p>
      <p v-if="errorConsumo" role="alert" class="message error">{{ errorConsumo }}</p>
      <p v-if="resultadoConsumo" role="status" class="message resultado">
        <template v-if="resultadoConsumo.estado === 'descontado'">
          Administración {{ resultadoConsumo.idAdministracion }}: se descontaron
          {{ resultadoConsumo.cantidadDescontada }} unidades del insumo
          {{ resultadoConsumo.idInsumo }}. Existencias al procesar el consumo:
          {{ resultadoConsumo.stockRestante }}.
        </template>
        <template v-else
          >La administración {{ resultadoConsumo.idAdministracion }} ya fue procesada. No se
          descontaron unidades adicionales.</template
        >
      </p>
      <div class="toolbar">
        <label for="piso-inventario" class="filter"
          >Piso
          <select id="piso-inventario" v-model="piso">
            <option value="todos">Todos</option>
            <option value="sin-piso">Sin piso asignado</option>
            <option v-for="opcion in pisos" :key="opcion" :value="String(opcion)">
              {{ opcion }}
            </option>
          </select>
        </label>
      </div>
      <p v-if="cargando" role="status" class="loading">Consultando existencias…</p>
      <p v-if="!cargando && !consultaVigente && insumos.length" class="message error">
        La consulta no está actualizada.
      </p>
      <div class="tabla" :aria-busy="cargando">
        <table>
          <caption>
            Existencias por insumo y piso
          </caption>
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Insumo</th>
              <th scope="col">Piso</th>
              <th scope="col">Stock</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="insumo in filtrados" :key="insumo.id">
              <td>{{ insumo.id }}</td>
              <td>{{ insumo.nombre }}</td>
              <td>{{ insumo.piso ?? 'Sin asignar' }}</td>
              <td :class="{ agotado: insumo.stock === 0 }">
                {{ insumo.stock }}
                <span v-if="insumo.stock === 0" class="stock-agotado">Sin stock</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="!cargando && consultaVigente && !filtrados.length" class="empty">
        No hay insumos para el piso seleccionado.
      </p>
    </div>
  </div>
</template>

<style scoped src="../styles/recursos-camas.css"></style>
