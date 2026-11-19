
<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';


import {
  idPaciente,
  cuenta,
  idCuentaCargo,
  mensajeCuenta,
  tipoCobertura,
  valorBase,
  copago,
  calculo,
  mensajeCalculo,
  concepto,
  importe,
  mensajeCargo
} from '../state/estadoFacturacion';


import type {
  Cuenta,
  ResultadoCalculo
} from '../state/estadoFacturacion';

import FacturarPrestacionForm from '../components/FacturarPrestacionForm.vue';



// Estados de carga
const cargandoCuenta = ref(false);
const cargandoCargo = ref(false);
const cargandoCalculo = ref(false);

watch(idPaciente, (nuevoId, anteriorId) => {
  if (nuevoId === anteriorId) return;

  // Limpiar los datos del paciente anterior.
  cuenta.value = null;
  idCuentaCargo.value = null;
  mensajeCuenta.value = '';
});



function dinero(valor: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS'
  }).format(valor);
}

async function solicitar<T>(
  ruta: string,
  metodo: 'GET' | 'POST' = 'GET',
  cuerpo?: object
): Promise<T> {

  const respuesta = await fetch(`/api/facturacion${ruta}`, {
    method: metodo,
    credentials: 'include',
    headers: cuerpo
      ? { 'Content-Type': 'application/json' }
      : undefined,
    body: cuerpo ? JSON.stringify(cuerpo) : undefined
  });

  const datos: unknown = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    if (
      datos &&
      typeof datos === 'object' &&
      'mensaje' in datos
    ) {
      throw new Error(String(datos.mensaje));
    }

    throw new Error(`Error HTTP ${respuesta.status}`);
  }

  return datos as T;
}

function pacienteValido(): boolean {
  return (
    typeof idPaciente.value === 'number' &&
    Number.isSafeInteger(idPaciente.value) &&
    idPaciente.value > 0
  );
}

async function buscarCuenta() {
  mensajeCuenta.value = '';
  cuenta.value = null;

  if (!pacienteValido()) {
    mensajeCuenta.value = 'Ingresá un ID de paciente válido.';
    return;
  }

  cargandoCuenta.value = true;

  try {
    const resultado = await solicitar<{ cuenta: Cuenta }>(
      `/cuentas/paciente/${idPaciente.value}`
    );

    cuenta.value = resultado.cuenta;
    idCuentaCargo.value = resultado.cuenta.id;
    mensajeCuenta.value = 'Cuenta activa encontrada.';

  } catch (error) {
    mensajeCuenta.value =
      error instanceof Error ? error.message : 'Error al buscar cuenta.';
  } finally {
    cargandoCuenta.value = false;
  }
}

async function crearCuenta() {
  mensajeCuenta.value = '';

  if (!pacienteValido()) {
    mensajeCuenta.value = 'Ingresá un ID de paciente válido.';
    return;
  }

  cargandoCuenta.value = true;

  try {
    const resultado = await solicitar<{ cuenta: Cuenta }>(
      '/cuentas',
      'POST',
      { idPaciente: idPaciente.value }
    );

    cuenta.value = resultado.cuenta;
    idCuentaCargo.value = resultado.cuenta.id;
    mensajeCuenta.value = 'Cuenta creada correctamente.';

  } catch (error) {
    mensajeCuenta.value =
      error instanceof Error ? error.message : 'Error al crear cuenta.';
  } finally {
    cargandoCuenta.value = false;
  }
}

async function registrarCargo() {
  mensajeCargo.value = '';

  if (
    typeof idCuentaCargo.value !== 'number' ||
    !Number.isSafeInteger(idCuentaCargo.value) ||
    idCuentaCargo.value <= 0
  ) {
    mensajeCargo.value = 'Seleccioná una cuenta válida.';
    return;
  }

  if (!concepto.value.trim()) {
    mensajeCargo.value = 'Ingresá el concepto del cargo.';
    return;
  }

  if (
    typeof importe.value !== 'number' ||
    !Number.isFinite(importe.value) ||
    importe.value < 0
  ) {
    mensajeCargo.value = 'Ingresá un importe válido.';
    return;
  }

  cargandoCargo.value = true;

  try {
    await solicitar(
      '/cargos/manuales',
      'POST',
      {
        idCuenta: idCuentaCargo.value,
        concepto: concepto.value.trim(),
        importe: importe.value
      }
    );

    mensajeCargo.value = 'Cargo registrado correctamente.';
    concepto.value = '';
    importe.value = null;

  } catch (error) {
    mensajeCargo.value =
      error instanceof Error ? error.message : 'Error al registrar cargo.';
  } finally {
    cargandoCargo.value = false;
  }
}

async function calcularPrestacion() {
  mensajeCalculo.value = '';
  calculo.value = null;
  cargandoCalculo.value = true;

  try {
    const cuerpo = {
      tipoCobertura: tipoCobertura.value,
      valorBase: valorBase.value,
      ...(tipoCobertura.value === 'prepaga'
        ? { copago: copago.value }
        : {})
    };

    calculo.value = await solicitar<ResultadoCalculo>(
      '/prestaciones/calcular',
      'POST',
      cuerpo
    );

  } catch (error) {
    mensajeCalculo.value =
      error instanceof Error ? error.message : 'Error al calcular prestación.';
  } finally {
    cargandoCalculo.value = false;
  }
}

onMounted(async () => {
  if (
    cuenta.value !== null &&
    idPaciente.value === cuenta.value.idPaciente
  ) {
    const idCuentaGuardado = idCuentaCargo.value;

    await buscarCuenta();

    idCuentaCargo.value = idCuentaGuardado;
  }
});

</script>

<template>
  <main class="facturacion-page">
    <header class="facturacion-header">
      <div>
        <p class="eyebrow">HOSPITAL UTN · ADMINISTRACIÓN</p>
        <h1>Facturación</h1>
        <p class="subtitulo">
          Gestión de cuentas, cargos y coberturas de pacientes.
        </p>
      </div>

      <span class="modulo-etiqueta">Back-Office</span>
    </header>

    <div class="facturacion-grid">

      <!-- CUENTAS -->
      <section class="panel">
        <div class="panel-header">
          <span class="numero">01</span>
          <div>
            <h2>Cuentas de pacientes</h2>
            <p>Buscar una cuenta activa o abrir una nueva.</p>
          </div>
        </div>

        <label for="id-paciente">ID del paciente</label>
        <input
          id="id-paciente"
          v-model.number="idPaciente"
          type="number"
          min="1"
          placeholder="Ej. 1"
        />

        <div class="acciones">
          <button
            class="btn btn-secundario"
            :disabled="cargandoCuenta"
            @click="buscarCuenta"
          >
            Buscar cuenta
          </button>

          <button
            class="btn btn-primario"
            :disabled="cargandoCuenta"
            @click="crearCuenta"
          >
            Crear cuenta
          </button>
        </div>

        <p v-if="mensajeCuenta" class="mensaje">
          {{ mensajeCuenta }}
        </p>

        <div v-if="cuenta" class="resultado">
          <span>CUENTA ACTIVA</span>
          <strong>#{{ cuenta.id }}</strong>
          <p>Paciente #{{ cuenta.idPaciente }}</p>
        </div>
      </section>

      <!-- CARGOS -->
      <section class="panel">
        <div class="panel-header">
          <span class="numero">02</span>
          <div>
            <h2>Registrar cargo</h2>
            <p>Agregar un gasto a una cuenta existente.</p>
          </div>
        </div>

        <label for="id-cuenta">ID de la cuenta</label>
        <input
          id="id-cuenta"
          v-model.number="idCuentaCargo"
          type="number"
          min="1"
          placeholder="Ej. 1"
        />

        <label for="concepto">Concepto</label>
        <input
          id="concepto"
          v-model="concepto"
          type="text"
          maxlength="100"
          placeholder="Ej. Consulta médica"
        />

        <label for="importe">Importe ($)</label>
        <input
          id="importe"
          v-model.number="importe"
          type="number"
          min="0"
          step="0.01"
          placeholder="Ej. 15000"
        />

        <button
          class="btn btn-primario btn-completo"
          :disabled="cargandoCargo"
          @click="registrarCargo"
        >
          Registrar cargo
        </button>

        <p v-if="mensajeCargo" class="mensaje">
          {{ mensajeCargo }}
        </p>
      </section>

      <!-- COBERTURAS -->
      <section class="panel panel-ancho">
        <div class="panel-header">
          <span class="numero">03</span>
          <div>
            <h2>Calcular prestación</h2>
            <p>
              Determinar los importes correspondientes al paciente
              y a su cobertura.
            </p>
          </div>
        </div>

        <div class="form-grid">
          <div>
            <label for="tipo-cobertura">Tipo de cobertura</label>
            <select
              id="tipo-cobertura"
              v-model="tipoCobertura"
              @change="calculo = null"
            >
              <option value="publica">Cobertura pública</option>
              <option value="prepaga">Medicina prepaga</option>
              <option value="particular">Particular</option>
            </select>
          </div>

          <div>
            <label for="valor-base">Valor de la prestación ($)</label>
            <input
              id="valor-base"
              v-model.number="valorBase"
              type="number"
              min="0"
              step="0.01"
            />
          </div>

          <div v-if="tipoCobertura === 'prepaga'">
            <label for="copago">Copago del paciente ($)</label>
            <input
              id="copago"
              v-model.number="copago"
              type="number"
              min="0"
              step="0.01"
            />
          </div>
        </div>

        <button
          class="btn btn-primario"
          :disabled="cargandoCalculo"
          @click="calcularPrestacion"
        >
          Calcular importes
        </button>

        <p v-if="mensajeCalculo" class="mensaje">
          {{ mensajeCalculo }}
        </p>

        <div v-if="calculo" class="totales">
          <div class="total-item">
            <span>Paga el paciente</span>
            <strong>{{ dinero(calculo.montoPaciente) }}</strong>
          </div>

          <div class="total-item">
            <span>Paga la cobertura</span>
            <strong>{{ dinero(calculo.montoCobertura) }}</strong>
          </div>
        </div>

        <p class="aclaracion">
          Esta sección calcula importes. No registra automáticamente
          una prestación ni genera un reclamo.
        </p>
      </section>

<!-- FACTURAR PRESTACIÓN - HU 1.1 -->
<div class="panel-ancho">
  <FacturarPrestacionForm
    :id-cuenta-inicial="idCuentaCargo"
  />
</div>

    </div>
  </main>
</template>

<style scoped>
.facturacion-page {
  min-height: 100vh;
  padding: 36px;
  background: #f5f7fa;
  color: #17233b;
  font-family: Inter, Arial, sans-serif;
}

.facturacion-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 32px;
}

.eyebrow {
  margin: 0 0 10px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: #55729a;
}

h1 {
  margin: 0;
  font-size: 36px;
  letter-spacing: -1px;
}

.subtitulo {
  margin: 10px 0 0;
  color: #64748b;
}

.modulo-etiqueta {
  padding: 10px 14px;
  border: 1px solid #dbe4ef;
  border-radius: 10px;
  background: white;
  color: #526781;
  font-size: 12px;
  font-weight: 600;
}

.facturacion-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  max-width: 1200px;
}

.panel {
  padding: 26px;
  border: 1px solid #e0e7f0;
  border-radius: 16px;
  background: white;
  box-shadow: 0 3px 15px rgba(20, 40, 70, 0.035);
}

.panel-ancho {
  grid-column: 1 / -1;
}

.panel-header {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  margin-bottom: 25px;
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
  margin: 0 0 5px;
  font-size: 19px;
}

.panel-header p {
  margin: 0;
  color: #748195;
  font-size: 13px;
}

label {
  display: block;
  margin: 16px 0 7px;
  color: #41516a;
  font-size: 13px;
  font-weight: 600;
}

input,
select {
  width: 100%;
  box-sizing: border-box;
  padding: 12px 13px;
  border: 1px solid #d6dfeb;
  border-radius: 9px;
  background: white;
  color: #17233b;
  font: inherit;
  font-size: 14px;
}

input:focus,
select:focus {
  outline: none;
  border-color: #3675c8;
}

.acciones {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 22px;
}

.btn {
  padding: 12px 18px;
  border: 0;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.6;
  cursor: wait;
}

.btn-primario {
  background: #245eaa;
  color: white;
}

.btn-primario:hover:not(:disabled) {
  background: #194d91;
}

.btn-secundario {
  background: #eaf1fa;
  color: #245eaa;
}

.btn-completo {
  width: 100%;
  margin-top: 22px;
}

.mensaje {
  margin: 16px 0 0;
  font-size: 13px;
  color: #245eaa;
}

.resultado {
  margin-top: 18px;
  padding: 18px;
  background: #f0f6ff;
  border-radius: 12px;
}

.resultado span {
  display: block;
  color: #55729a;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
}

.resultado strong {
  display: block;
  margin-top: 7px;
  font-size: 24px;
}

.resultado p {
  margin: 6px 0 0;
  color: #526781;
  font-size: 13px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 20px;
}

.panel-ancho > .btn {
  margin-top: 22px;
}

.totales {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 25px;
}

.total-item {
  padding: 20px;
  border: 1px solid #deebfb;
  border-radius: 12px;
  background: #f5f9ff;
}

.total-item span {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  color: #61738c;
}

.total-item strong {
  font-size: 25px;
  color: #163d74;
}

.aclaracion {
  margin: 16px 0 0;
  font-size: 12px;
  color: #8491a2;
}

@media (max-width: 760px) {
  .facturacion-page {
    padding: 18px;
  }

  .facturacion-header {
    flex-direction: column;
  }

  .facturacion-grid,
  .form-grid,
  .totales {
    grid-template-columns: 1fr;
  }

  .panel-ancho {
    grid-column: auto;
  }

  h1 {
    font-size: 29px;
  }
}
</style>
