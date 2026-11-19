
import { ref, reactive, watch } from 'vue';
import { rolActual } from '../../../../router/autenticacion';

export interface Cuenta {
  id: number;
  idPaciente: number;
}

// Conservamos la búsqueda mientras navegamos por el sistema.
export const idPaciente = ref<number | null>(null);
export const cuenta = ref<Cuenta | null>(null);
export const idCuentaCargo = ref<number | null>(null);
export const mensajeCuenta = ref('');

export const concepto = ref('');
export const importe = ref<number | null>(null);
export const mensajeCargo = ref('');

export type TipoCobertura = 'publica' | 'prepaga' | 'particular';

export interface ResultadoCalculo {
  montoPaciente: number;
  montoCobertura: number;
}

export const tipoCobertura = ref<TipoCobertura>('particular');
export const valorBase = ref<number>(15000);
export const copago = ref<number>(3000);
export const calculo = ref<ResultadoCalculo | null>(null);
export const mensajeCalculo = ref('');

export interface ResultadoFacturacion {
  idCargo: number;
  idReclamo: number | null;
  montoPaciente: number;
  montoCobertura: number;
}

// Estado de la sección 04 - Facturar prestación
export const prestacion = reactive({
  idCuenta: null as number | null,
  concepto: 'Consulta Médica General',
  valorBase: 15000 as number | null,
  tipoCobertura: 'particular' as TipoCobertura,
  copago: 3000 as number | null,
  entidadDestino: '',

  confirmando: false,
  registrado: false,
  mensajeError: '',
  resultado: null as ResultadoFacturacion | null
});



 // Limpiamos los datos al cerrar sesión o perder el rol.
watch(rolActual, (rol) => {
  if (rol !== 'Administrador') {
    idPaciente.value = null;
    cuenta.value = null;
    idCuentaCargo.value = null;
    mensajeCuenta.value = '';

    tipoCobertura.value = 'particular';
    valorBase.value = 15000;
    copago.value = 3000;
    calculo.value = null;
    mensajeCalculo.value = '';

    concepto.value = '';
    importe.value = null;
    mensajeCargo.value = '';

    Object.assign(prestacion, {
      idCuenta: null,
      concepto: 'Consulta Médica General',
      valorBase: 15000,
      tipoCobertura: 'particular',
      copago: 3000,
      entidadDestino: '',
      confirmando: false,
      registrado: false,
      mensajeError: '',
      resultado: null
    });

  }
}, { flush: 'sync' });

