import type {
  AccionCama,
  SolicitudTransicionCama,
} from '../../domain/repositories/ITransicionCamaRepository.js'
import { ErrorRecursosCamas, validarId } from '../../domain/errors/ErrorRecursosCamas.js'
import { crearEstadoCama, type EstadoCamaNombre } from '../../domain/states/EstadoCama.js'

export function validarTransicion(
  accion: AccionCama,
  parametroId: unknown,
  body: unknown,
): SolicitudTransicionCama {
  if (typeof parametroId !== 'string' || !/^[1-9]\d*$/.test(parametroId)) {
    throw new ErrorRecursosCamas('DATOS_INVALIDOS', 'idCama debe ser un entero positivo válido.')
  }
  const idCama = Number(parametroId)
  validarId(idCama, 'idCama')
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ErrorRecursosCamas('DATOS_INVALIDOS', 'Se requiere un objeto con el estado esperado.')
  }
  const datos = body as Record<string, unknown>
  const permitidos =
    accion === 'liberar' ? ['estadoEsperado', 'idAsignacion', 'motivo'] : ['estadoEsperado']
  if (
    Object.keys(datos).some((campo) => !permitidos.includes(campo)) ||
    typeof datos.estadoEsperado !== 'string'
  ) {
    throw new ErrorRecursosCamas('DATOS_INVALIDOS', 'Los campos de la transición no son válidos.')
  }
  const estadoEsperado = datos.estadoEsperado as EstadoCamaNombre
  crearEstadoCama(estadoEsperado)
  if (accion === 'liberar') {
    if (
      typeof datos.idAsignacion !== 'number' ||
      (datos.motivo !== 'alta' && datos.motivo !== 'traslado')
    ) {
      throw new ErrorRecursosCamas(
        'DATOS_INVALIDOS',
        'Se requiere idAsignacion y motivo alta o traslado.',
      )
    }
    validarId(datos.idAsignacion, 'idAsignacion')
    return {
      accion,
      idCama,
      estadoEsperado,
      idAsignacion: datos.idAsignacion,
      motivo: datos.motivo,
    }
  }
  return { accion, idCama, estadoEsperado }
}
