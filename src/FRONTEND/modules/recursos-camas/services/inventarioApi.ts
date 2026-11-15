import type { Insumo, InventarioApi } from '../types/inventario'

export function crearInventarioApi(
  baseUrl = '/api/recursos-camas',
  solicitar: typeof fetch = (...args) => fetch(...args),
): InventarioApi {
  return {
    async listar() {
      const respuesta = await solicitar(`${baseUrl}/insumos`, { credentials: 'same-origin' })
      if (!(respuesta.headers.get('content-type') ?? '').includes('application/json')) {
        throw new Error('El inventario no está disponible. Volvé a consultar las existencias.')
      }
      const datos: unknown = await respuesta.json()
      if (!respuesta.ok) {
        const mensaje =
          typeof datos === 'object' &&
          datos !== null &&
          'mensaje' in datos &&
          typeof datos.mensaje === 'string'
            ? datos.mensaje
            : 'No se pudo consultar el inventario.'
        throw new Error(mensaje)
      }
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
