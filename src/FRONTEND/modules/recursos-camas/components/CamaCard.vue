<script setup lang="ts">
import type { Cama, AccionCama } from '../types/camas'
defineProps<{ cama: Cama; deshabilitada: boolean }>()
defineEmits<{ asignar: [cama: Cama]; transicionar: [cama: Cama, accion: AccionCama] }>()
</script>

<template>
  <article
    class="cama"
    :class="[
      `estado-${cama.estado.toLowerCase().replace(' ', '-')}`,
      { disponible: cama.disponible },
    ]"
  >
    <div class="cabecera">
      <h2>Cama {{ cama.id }}</h2>
      <span class="estado"><span class="punto" aria-hidden="true"></span>{{ cama.estado }}</span>
    </div>
    <p>Habitación {{ cama.habitacion }} · Piso {{ cama.piso }}</p>
    <p>{{ cama.tipo }}</p>
    <p v-if="cama.estado === 'Libre' && !cama.disponible" class="advertencia">
      Tiene una asignación activa. Revisar disponibilidad.
    </p>
    <button :disabled="!cama.disponible || deshabilitada" @click="$emit('asignar', cama)">
      {{ cama.disponible ? 'Asignar paciente' : 'No disponible' }}
    </button>
    <div class="operaciones">
      <button
        v-if="cama.estado === 'Ocupada'"
        :disabled="deshabilitada || !cama.idAsignacionActiva"
        @click="$emit('transicionar', cama, 'liberar')"
      >
        Liberar por alta o traslado
      </button>
      <button
        v-if="cama.estado === 'En limpieza'"
        :disabled="deshabilitada || !!cama.idAsignacionActiva"
        @click="$emit('transicionar', cama, 'confirmar-limpieza')"
      >
        Confirmar limpieza
      </button>
      <button
        v-if="cama.estado === 'En limpieza' || cama.estado === 'Libre'"
        :disabled="deshabilitada || !!cama.idAsignacionActiva"
        @click="$emit('transicionar', cama, 'bloquear')"
      >
        Bloquear por mantenimiento
      </button>
      <button
        v-if="cama.estado === 'Bloqueada'"
        :disabled="deshabilitada || !!cama.idAsignacionActiva"
        @click="$emit('transicionar', cama, 'finalizar-mantenimiento')"
      >
        Finalizar mantenimiento
      </button>
    </div>
    <p v-if="cama.estado === 'Ocupada' && !cama.idAsignacionActiva" class="advertencia">
      Falta la asignación activa. Revisar antes de liberar.
    </p>
  </article>
</template>

<style scoped>
.cama {
  padding: 22px;
  border: 1px solid #e5ebf1;
  border-top: 3px solid #087fc4;
  border-radius: 12px;
  background: white;
  box-shadow: 0 3px 12px rgb(16 42 67 / 4%);
}
.estado-libre {
  border-top-color: #238452;
}
.estado-en-limpieza {
  border-top-color: #d38a17;
}
.estado-bloqueada {
  border-top-color: #d83b3b;
}
.cabecera {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}
h2 {
  margin: 0;
  color: #163247;
  font-size: 16px;
}
.estado {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 9px;
  border-radius: 6px;
  background: #e5f5ff;
  color: #087fc4;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}
.estado-libre .estado {
  background: #e8f7ef;
  color: #238452;
}
.estado-en-limpieza .estado {
  background: #fff6e5;
  color: #92600f;
}
.estado-bloqueada .estado {
  background: #fff0f0;
  color: #b52e2e;
}
.punto {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
p {
  color: #718496;
  font-size: 12px;
  line-height: 1.6;
}
.advertencia {
  padding: 10px;
  border-radius: 6px;
  background: #fff6e5;
  color: #92600f;
}
.operaciones {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
button {
  max-width: 100%;
  padding: 10px 14px;
  border: 1px solid #087fc4;
  border-radius: 7px;
  background: #087fc4;
  color: white;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
button:hover:not(:disabled) {
  background: #066eac;
}
.operaciones button {
  border-color: #dce5eb;
  background: white;
  color: #526879;
}
.operaciones button:hover:not(:disabled) {
  border-color: #087fc4;
  background: #f1f7fb;
  color: #087fc4;
}
button:disabled {
  border-color: #e8eef3;
  background: #e8eef3;
  color: #718496;
  cursor: default;
}
button:focus-visible {
  outline: 2px solid #087fc4;
  outline-offset: 3px;
}
@media (max-width: 600px) {
  .cama {
    padding: 18px 16px;
  }
  .operaciones {
    flex-direction: column;
  }
  .operaciones button {
    width: 100%;
  }
}
</style>
