<script setup lang="ts">
import { ref } from 'vue'
import type { AccionCama, Cama, SolicitudTransicion } from '../services/recursosCamasApi'
const props = defineProps<{ cama: Cama; accion: AccionCama; enviando: boolean }>()
const emit = defineEmits<{ confirmar: [solicitud: SolicitudTransicion]; cancelar: [] }>()
const motivo = ref<'alta' | 'traslado'>('alta')
const titulos: Record<AccionCama, string> = {
  liberar: 'Liberar por alta o traslado',
  'confirmar-limpieza': 'Confirmar limpieza finalizada',
  bloquear: 'Bloquear por mantenimiento',
  'finalizar-mantenimiento': 'Finalizar mantenimiento',
}
const explicaciones: Record<AccionCama, string> = {
  liberar:
    'Se cerrará la asignación activa y la cama pasará a En limpieza. No podrá asignarse hasta confirmar la higiene.',
  'confirmar-limpieza':
    'Confirmá únicamente si la higiene terminó. La cama quedará Libre para una nueva asignación.',
  bloquear:
    'La cama quedará Bloqueada y fuera de servicio. No se podrá asignar mientras dure el mantenimiento.',
  'finalizar-mantenimiento':
    'La cama pasará a En limpieza. Será necesario confirmar la higiene antes de asignarla.',
}
function confirmar() {
  if (props.enviando) return
  if (props.accion === 'liberar') {
    if (!props.cama.idAsignacionActiva) return
    emit('confirmar', {
      accion: 'liberar',
      estadoEsperado: props.cama.estado,
      idAsignacion: props.cama.idAsignacionActiva,
      motivo: motivo.value,
    })
  } else emit('confirmar', { accion: props.accion, estadoEsperado: props.cama.estado })
}
</script>

<template>
  <section class="transicion" aria-labelledby="titulo-transicion">
    <h2 id="titulo-transicion">{{ titulos[accion] }} · Cama {{ cama.id }}</h2>
    <p>{{ explicaciones[accion] }}</p>
    <form @submit.prevent="confirmar">
      <label v-if="accion === 'liberar'" for="motivo-liberacion"
        >Motivo
        <select id="motivo-liberacion" v-model="motivo" :disabled="enviando">
          <option value="alta">Alta</option>
          <option value="traslado">Traslado</option>
        </select>
      </label>
      <p v-if="accion === 'liberar' && !cama.idAsignacionActiva" role="alert">
        No se pudo identificar la asignación activa. Actualizá el mapa.
      </p>
      <div class="acciones">
        <button
          type="submit"
          :disabled="enviando || (accion === 'liberar' && !cama.idAsignacionActiva)"
        >
          {{ enviando ? 'Guardando…' : 'Confirmar operación' }}
        </button>
        <button type="button" :disabled="enviando" @click="emit('cancelar')">Cancelar</button>
      </div>
    </form>
  </section>
</template>

<style scoped>
.asignacion,
.transicion {
  padding: 22px;
  margin: 0 0 24px;
  border: 1px solid #e5ebf1;
  border-top: 3px solid #087fc4;
  border-radius: 12px;
  background: white;
  box-shadow: 0 3px 12px rgb(16 42 67 / 4%);
  color: #20394b;
  font-family:
    Inter,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
}
h2 {
  margin: 0 0 10px;
  color: #163247;
  font-size: 17px;
}
p {
  margin: 0 0 20px;
  color: #718496;
  font-size: 12px;
  line-height: 1.6;
}
label {
  display: block;
  margin-bottom: 8px;
  color: #526879;
  font-size: 12px;
  font-weight: 600;
}
input,
select {
  box-sizing: border-box;
  display: block;
  width: min(100%, 360px);
  padding: 11px 12px;
  margin: 8px 0;
  border: 1px solid #dce5eb;
  border-radius: 7px;
  background: white;
  color: #20394b;
  font: inherit;
  font-size: 13px;
}
small {
  display: block;
  color: #718496;
  font-size: 11px;
  line-height: 1.6;
}
.acciones {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 20px;
}
button {
  padding: 11px 18px;
  border: 1px solid #dce5eb;
  border-radius: 8px;
  background: white;
  color: #526879;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
button[type='submit'] {
  border-color: #087fc4;
  background: #087fc4;
  color: white;
}
button[type='submit']:hover:not(:disabled) {
  border-color: #066eac;
  background: #066eac;
}
button[type='button']:hover:not(:disabled) {
  border-color: #087fc4;
  color: #087fc4;
}
button:disabled {
  border-color: #e8eef3;
  background: #e8eef3;
  color: #718496;
  cursor: default;
}
input:focus-visible,
select:focus-visible,
button:focus-visible {
  outline: 2px solid #087fc4;
  outline-offset: 3px;
}
[role='alert'] {
  color: #b52e2e;
}
@media (max-width: 600px) {
  .asignacion,
  .transicion {
    padding: 18px 16px;
  }
  .acciones {
    flex-direction: column;
  }
  .acciones button {
    width: 100%;
  }
}
</style>
