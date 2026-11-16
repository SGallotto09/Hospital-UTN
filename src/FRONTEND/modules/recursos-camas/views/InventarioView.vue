<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { crearInventarioApi } from '../services/recursosCamasApi'
import type { Insumo, InventarioApi, ResultadoConsumo } from '../services/recursosCamasApi'
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
