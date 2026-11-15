<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Cama } from '../types/camas'
defineProps<{ cama: Cama; enviando: boolean }>()
const emit = defineEmits<{ confirmar: [idPaciente: number]; cancelar: [] }>()
const paciente = ref('')
const pacienteValido = computed(
  () =>
    /^\d+$/.test(paciente.value) &&
    Number.isSafeInteger(Number(paciente.value)) &&
    Number(paciente.value) > 0 &&
    Number(paciente.value) <= 2147483647,
)
function confirmar() {
  if (pacienteValido.value) emit('confirmar', Number(paciente.value))
}
</script>

<template>
  <section aria-labelledby="titulo-asignacion" class="asignacion">
    <h2 id="titulo-asignacion">Asignar cama {{ cama.id }}</h2>
    <p>
      Habitación {{ cama.habitacion }}, piso {{ cama.piso }}. La disponibilidad se verifica al
      confirmar.
    </p>
    <form @submit.prevent="confirmar">
      <label for="paciente-id">ID del paciente registrado</label>
      <input
        id="paciente-id"
        v-model="paciente"
        inputmode="numeric"
        autocomplete="off"
        :disabled="enviando"
        required
        aria-describedby="ayuda-paciente"
      />
      <small id="ayuda-paciente"
        >Ingresá el identificador del paciente proporcionado por Admisión.</small
      >
      <div class="acciones">
        <button type="submit" :disabled="enviando || !pacienteValido">
          {{ enviando ? 'Asignando…' : 'Confirmar asignación' }}
        </button>
        <button type="button" :disabled="enviando" @click="emit('cancelar')">Cancelar</button>
      </div>
    </form>
  </section>
</template>

<style scoped src="../styles/formularios.css"></style>
