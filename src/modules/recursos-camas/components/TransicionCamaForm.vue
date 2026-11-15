<script setup lang="ts">
import { ref } from 'vue'
import type { AccionCama, Cama, SolicitudTransicion } from '../types/camas'
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

<style scoped src="../styles/formularios.css"></style>
