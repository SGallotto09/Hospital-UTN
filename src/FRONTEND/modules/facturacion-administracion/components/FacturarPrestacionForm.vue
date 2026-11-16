
<script setup lang="ts">
import { ref, watch } from 'vue';

type TipoCobertura = 'publica' | 'prepaga' | 'particular';

interface ResultadoFacturacion {
  idCargo: number;
  idReclamo: number | null;
  montoPaciente: number;
  montoCobertura: number;
}

const props = defineProps<{
  idCuentaInicial?: number | null;
}>();

const idCuenta = ref<number | null>(
  props.idCuentaInicial ?? null
);

const concepto = ref('Consulta Médica General');
const valorBase = ref<number | null>(15000);
const tipoCobertura = ref<TipoCobertura>('particular');
const copago = ref<number | null>(3000);
const entidadDestino = ref('');

const cargando = ref(false);
const confirmando = ref(false);
const registrado = ref(false);

const mensajeError = ref('');
const resultado = ref<ResultadoFacturacion | null>(null);

watch(
  () => props.idCuentaInicial,
  (nuevoId) => {
    if (
      typeof nuevoId === 'number' &&
      Number.isSafeInteger(nuevoId) &&
      nuevoId > 0
    ) {
      idCuenta.value = nuevoId;
    }
  }
);

watch(
  [
    idCuenta,
    concepto,
    valorBase,
    tipoCobertura,
    copago,
    entidadDestino
  ],
  () => {
    confirmando.value = false;
    registrado.value = false;
    resultado.value = null;
    mensajeError.value = '';
  }
);

function dinero(valor: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS'
  }).format(valor);
}

function importeValido(valor: unknown): valor is number {
  return (
    typeof valor === 'number' &&
    Number.isFinite(valor) &&
    valor >= 0 &&
    valor <= 99999999.99 &&
    Math.abs(valor * 100 - Math.round(valor * 100)) < 0.000001
  );
}

function validar(): boolean {
  mensajeError.value = '';

  if (
    !Number.isSafeInteger(idCuenta.value) ||
    (idCuenta.value ?? 0) <= 0
  ) {
    mensajeError.value = 'Ingresá un ID de cuenta válido.';
    return false;
  }

  if (
    !concepto.value.trim() ||
    concepto.value.trim().length > 100
  ) {
    mensajeError.value = 'Ingresá un concepto válido.';
    return false;
  }

  if (!importeValido(valorBase.value)) {
    mensajeError.value = 'Ingresá un valor base válido.';
    return false;
  }

  if (tipoCobertura.value === 'prepaga') {
    if (
      !importeValido(copago.value) ||
      copago.value > valorBase.value
    ) {
      mensajeError.value = 'El copago no es válido.';
      return false;
    }

    if (
      !entidadDestino.value.trim() ||
      entidadDestino.value.trim().length > 100
    ) {
      mensajeError.value = 'Ingresá el nombre de la prepaga.';
      return false;
    }
  }

  return true;
}

function revisarFacturacion() {
  if (!validar()) return;

  resultado.value = null;
  confirmando.value = true;
}

async function confirmarFacturacion() {
  if (cargando.value || registrado.value || !confirmando.value) {
    return;
  }

  if (!validar()) {
    confirmando.value = false;
    return;
  }

  cargando.value = true;
  mensajeError.value = '';

  try {
    const cuerpo = {
      idCuenta: idCuenta.value,
      concepto: concepto.value.trim(),
      valorBase: valorBase.value,
      tipoCobertura: tipoCobertura.value,

      ...(tipoCobertura.value === 'prepaga'
        ? {
            copago: copago.value,
            entidadDestino: entidadDestino.value.trim()
          }
        : {})
    };

    const respuesta = await fetch(
      '/api/facturacion/prestaciones/facturar',
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cuerpo)
      }
    );

    const datos = await respuesta.json().catch(() => null);

    if (!respuesta.ok) {
      const mensaje =
        datos &&
        typeof datos === 'object' &&
        'mensaje' in datos
          ? String(datos.mensaje)
          : `Error HTTP ${respuesta.status}`;

      throw new Error(mensaje);
    }



    resultado.value = datos as ResultadoFacturacion;
    registrado.value = true;
    confirmando.value = false;

  } catch (error) {
    mensajeError.value =
      error instanceof Error
        ? error.message
        : 'No se pudo registrar la prestación.';

  } finally {
    cargando.value = false;
  }
}
</script>

<template>
  <section class="prestacion-panel">

    <div class="panel-encabezado">
      <div class="numero">04</div>

      <div>
        <h2>Facturar prestación</h2>
        <p>
          Registrar una consulta médica y distribuir
          los importes según la cobertura.
        </p>
      </div>
    </div>

    <div class="form-grid">

      <div class="campo">
        <label for="fp-cuenta">ID de cuenta</label>
        <input
          id="fp-cuenta"
          v-model.number="idCuenta"
          type="number"
          min="1"
          placeholder="Ej. 1"
          :disabled="cargando"
        />
      </div>

      <div class="campo">
        <label for="fp-concepto">Concepto</label>
        <input
          id="fp-concepto"
          v-model="concepto"
          type="text"
          maxlength="100"
          :disabled="cargando"
        />
      </div>

      <div class="campo">
        <label for="fp-valor">Valor de la prestación ($)</label>
        <input
          id="fp-valor"
          v-model.number="valorBase"
          type="number"
          min="0"
          step="0.01"
          :disabled="cargando"
        />
      </div>

      <div class="campo">
        <label for="fp-cobertura">Tipo de cobertura</label>
        <select
          id="fp-cobertura"
          v-model="tipoCobertura"
          :disabled="cargando"
        >
          <option value="particular">Particular</option>
          <option value="publica">Cobertura pública</option>
          <option value="prepaga">Medicina prepaga</option>
        </select>
      </div>

      <template v-if="tipoCobertura === 'prepaga'">

        <div class="campo">
          <label for="fp-copago">Copago del paciente ($)</label>
          <input
            id="fp-copago"
            v-model.number="copago"
            type="number"
            min="0"
            step="0.01"
            :disabled="cargando"
          />
        </div>

        <div class="campo">
          <label for="fp-entidad">Nombre de la prepaga</label>
          <input
            id="fp-entidad"
            v-model="entidadDestino"
            type="text"
            maxlength="100"
            placeholder="Ej. OSDE"
            :disabled="cargando"
          />
        </div>

      </template>
    </div>

    <p class="advertencia">
      Esta operación registra importes reales en la base de datos.
      Verificá los datos antes de confirmar.
    </p>

    <div v-if="!confirmando && !registrado" class="acciones">
      <button
        class="boton-primario"
        type="button"
        :disabled="cargando"
        @click="revisarFacturacion"
      >
        Revisar facturación
      </button>
    </div>

    <div v-if="confirmando" class="confirmacion">
      <h3>Confirmar prestación</h3>

      <p>
        Vas a registrar
        <strong>{{ concepto }}</strong>
        por {{ dinero(valorBase ?? 0) }}
        en la cuenta #{{ idCuenta }}.
      </p>

      <p>
        Cobertura:
        <strong>{{ tipoCobertura }}</strong>
      </p>

      <div class="acciones">
        <button
          type="button"
          class="boton-secundario"
          :disabled="cargando"
          @click="confirmando = false"
        >
          Volver
        </button>

        <button
          type="button"
          class="boton-primario"
          :disabled="cargando"
          @click="confirmarFacturacion"
        >
          {{ cargando ? 'Guardando...' : 'Confirmar y guardar' }}
        </button>
      </div>
    </div>

    <p v-if="mensajeError" class="mensaje-error">
      {{ mensajeError }}
    </p>

    <div v-if="resultado && registrado" class="resultado">
      <h3>Prestación registrada correctamente</h3>

      <div class="fila">
        <span>Cargo al paciente</span>
        <strong>{{ dinero(resultado.montoPaciente) }}</strong>
      </div>

      <div class="fila">
        <span>Importe de la cobertura</span>
        <strong>{{ dinero(resultado.montoCobertura) }}</strong>
      </div>

      <div class="fila">
        <span>ID del cargo</span>
        <strong>#{{ resultado.idCargo }}</strong>
      </div>

      <div v-if="resultado.idReclamo !== null" class="fila">
        <span>ID del reclamo</span>
        <strong>#{{ resultado.idReclamo }}</strong>
      </div>

      <p class="nota-resultado">
        No vuelvas a registrar esta misma prestación.
        Para cargar otra operación, modificá los datos.
      </p>
    </div>

  </section>
</template>

<style scoped>
.prestacion-panel {
  padding: 26px;
  border: 1px solid #e0e7f0;
  border-radius: 16px;
  background: #fff;
  color: #17233b;
  font-family: Inter, Arial, sans-serif;
  box-shadow: 0 3px 15px rgba(20, 40, 70, 0.035);
}

.panel-encabezado {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  margin-bottom: 24px;
}

.numero {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border-radius: 10px;
  background: #eaf1fc;
  color: #205399;
  font-weight: 700;
}

h2 {
  margin: 0 0 6px;
  font-size: 19px;
}

.panel-encabezado p {
  margin: 0;
  color: #748195;
  font-size: 13px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 20px;
}

.campo label {
  display: block;
  margin-bottom: 7px;
  font-size: 13px;
  font-weight: 600;
  color: #41516a;
}

input,
select {
  width: 100%;
  box-sizing: border-box;
  padding: 12px 13px;
  border: 1px solid #d6dfeb;
  border-radius: 9px;
  background: #fff;
  color: #17233b;
  font: inherit;
  font-size: 14px;
}

input:focus,
select:focus {
  outline: none;
  border-color: #3675c8;
}

.advertencia {
  margin: 20px 0;
  padding: 12px 14px;
  border-radius: 9px;
  background: #fff8e8;
  color: #805c1e;
  font-size: 12px;
}

.acciones {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

button {
  padding: 12px 18px;
  border: none;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

button:disabled {
  opacity: 0.6;
  cursor: wait;
}

.boton-primario {
  background: #245eaa;
  color: white;
}

.boton-secundario {
  background: #eaf1fa;
  color: #245eaa;
}

.confirmacion,
.resultado {
  margin-top: 20px;
  padding: 20px;
  border-radius: 12px;
  background: #f0f6ff;
}

.confirmacion h3,
.resultado h3 {
  margin: 0 0 12px;
  font-size: 16px;
}

.confirmacion p {
  font-size: 14px;
  color: #43546f;
}

.confirmacion .acciones {
  margin-top: 18px;
}

.fila {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  padding: 11px 0;
  border-bottom: 1px solid #dbe7f6;
  font-size: 14px;
}

.fila:last-of-type {
  border-bottom: none;
}

.fila strong {
  color: #163d74;
}

.mensaje-error {
  margin-top: 15px;
  color: #b42318;
  font-size: 13px;
}

.nota-resultado {
  margin: 15px 0 0;
  font-size: 12px;
  color: #60738d;
}

@media (max-width: 760px) {
  .prestacion-panel {
    padding: 18px;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
