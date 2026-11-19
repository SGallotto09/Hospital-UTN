export type EstadoCama = 'Libre' | 'Ocupada' | 'En limpieza' | 'Bloqueada'

export interface Cama {
  id: number
  estado: EstadoCama
  habitacion: number
  piso: number
  idTipoCama: number
  tipo: string
  disponible: boolean
  idAsignacionActiva: number | null
}

export interface Asignacion {
  id: number
  idCama: number
  idPaciente: number
  idUsuarioAsignador: number
  fechaIngreso: string
}

export type AccionCama = 'liberar' | 'confirmar-limpieza' | 'bloquear' | 'finalizar-mantenimiento'
export type SolicitudTransicion = { estadoEsperado: EstadoCama } & (
  | { accion: 'liberar'; idAsignacion: number; motivo: 'alta' | 'traslado' }
  | { accion: Exclude<AccionCama, 'liberar'> }
)

export interface ResultadoTransicion {
  idCama: number
  estadoAnterior: EstadoCama
  estado: EstadoCama
  idAsignacionFinalizada: number | null
  fechaEgreso: string | null
}

export interface PacienteParaAsignacion {
  id: number
  nombre: string
  apellido: string
  dni: string
}

export interface CamasApi {
  buscarPacientePorDni(dni: string): Promise<PacienteParaAsignacion>
  listar(): Promise<Cama[]>
  asignar(idCama: number, idPaciente: number): Promise<Asignacion>
  transicionar(idCama: number, solicitud: SolicitudTransicion): Promise<ResultadoTransicion>
}

export interface Insumo {
  id: number
  nombre: string
  stock: number
  piso: number | null
}

export interface ResultadoConsumo {
  estado: 'descontado' | 'duplicado'
  idEvento: string
  idAdministracion: number
  idInsumo: number
  cantidadDescontada: number
  stockRestante: number | null
}

export interface InventarioApi {
  listar(): Promise<Insumo[]>
}

export class ErrorCamasApi extends Error {
  constructor(
    public readonly status: number,
    mensaje: string,
  ) {
    super(mensaje)
  }
}

// Comparte transporte, credenciales y lectura de errores; mantiene los mensajes actuales de cada pantalla.
async function enviar<T>(
  url: string,
  solicitar: typeof fetch,
  opciones?: RequestInit,
  contexto: 'camas' | 'inventario' = 'camas',
): Promise<T> {
  const respuesta = await solicitar(url, { credentials: 'same-origin', ...opciones })
  const crearError = (mensaje: string) =>
    contexto === 'inventario' ? new Error(mensaje) : new ErrorCamasApi(respuesta.status, mensaje)
  if (!(respuesta.headers.get('content-type') ?? '').includes('application/json')) {
    throw crearError(
      contexto === 'inventario'
        ? 'El inventario no está disponible. Volvé a consultar las existencias.'
        : 'La API de recursos y camas no está disponible. No se confirmó la operación.',
    )
  }
  const datos: unknown = await respuesta.json()
  if (!respuesta.ok) {
    let mensaje =
      contexto === 'inventario'
        ? 'No se pudo consultar el inventario.'
        : 'No se pudo completar la operación.'
    if (
      typeof datos === 'object' &&
      datos !== null &&
      'mensaje' in datos &&
      typeof datos.mensaje === 'string'
    ) {
      mensaje = datos.mensaje
    }
    throw crearError(mensaje)
  }
  return datos as T
}

export function crearCamasApi(
  baseUrl = '/api/recursos-camas',
  solicitar: typeof fetch = (...args) => fetch(...args),
): CamasApi {
  return {
    async buscarPacientePorDni(dni) {
      return (await enviar<{ paciente: PacienteParaAsignacion }>(
        `${baseUrl}/pacientes?dni=${encodeURIComponent(dni)}`, solicitar,
      )).paciente
    },
    async listar() {
      return (await enviar<{ camas: Cama[] }>(`${baseUrl}/camas`, solicitar)).camas
    },
    async asignar(idCama, idPaciente) {
      const datos = await enviar<{ asignacion: Asignacion }>(`${baseUrl}/asignaciones`, solicitar, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idCama, idPaciente }),
      })
      return datos.asignacion
    },
    async transicionar(idCama, solicitud) {
      const rutas: Record<AccionCama, string> = {
        liberar: 'liberacion',
        'confirmar-limpieza': 'confirmacion-limpieza',
        bloquear: 'bloqueo',
        'finalizar-mantenimiento': 'fin-mantenimiento',
      }
      const { accion, ...body } = solicitud
      const datos = await enviar<{ transicion: ResultadoTransicion }>(
        `${baseUrl}/camas/${idCama}/${rutas[accion]}`,
        solicitar,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      )
      return datos.transicion
    },
  }
}

export function crearInventarioApi(
  baseUrl = '/api/recursos-camas',
  solicitar: typeof fetch = (...args) => fetch(...args),
): InventarioApi {
  return {
    async listar() {
      const datos = await enviar<unknown>(`${baseUrl}/insumos`, solicitar, undefined, 'inventario')
      if (
        typeof datos !== 'object' ||
        datos === null ||
        !('insumos' in datos) ||
        !Array.isArray(datos.insumos)
      ) {
        throw new Error('La respuesta del inventario no es válida.')
      }
      return datos.insumos as Insumo[]
    },
  }
}
