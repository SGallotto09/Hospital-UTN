<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Cama } from '../services/recursosCamasApi'
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
