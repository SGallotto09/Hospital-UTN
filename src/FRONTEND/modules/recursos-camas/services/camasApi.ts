import type { Asignacion, Cama, CamasApi, AccionCama, ResultadoTransicion } from '../types/camas'

export class ErrorCamasApi extends Error {
  constructor(
    public readonly status: number,
    mensaje: string,
  ) {
    super(mensaje)
  }
}

export function crearCamasApi(
  baseUrl = '/api/recursos-camas',
  solicitar: typeof fetch = (...args) => fetch(...args),
): CamasApi {
  async function enviar<T>(ruta: string, opciones?: RequestInit): Promise<T> {
    const respuesta = await solicitar(`${baseUrl}${ruta}`, {
      credentials: 'same-origin',
      ...opciones,
    })
    const contenido = respuesta.headers.get('content-type') ?? ''
    if (!contenido.includes('application/json')) {
      throw new ErrorCamasApi(
        respuesta.status,
        'La API de recursos y camas no está disponible. No se confirmó la operación.',
      )
    }
    const datos: unknown = await respuesta.json()
    if (!respuesta.ok) {
      const mensaje =
        typeof datos === 'object' &&
        datos !== null &&
        'mensaje' in datos &&
        typeof datos.mensaje === 'string'
          ? datos.mensaje
          : 'No se pudo completar la operación.'
      throw new ErrorCamasApi(respuesta.status, mensaje)
    }
    return datos as T
  }

  return {
    async listar() {
      return (await enviar<{ camas: Cama[] }>('/camas')).camas
    },
    async asignar(idCama, idPaciente) {
      const datos = await enviar<{ asignacion: Asignacion }>('/asignaciones', {
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
        `/camas/${idCama}/${rutas[accion]}`,
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
