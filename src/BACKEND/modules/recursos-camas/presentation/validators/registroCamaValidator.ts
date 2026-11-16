import { ErrorRecursosCamas, validarId } from '../../domain/errors/ErrorRecursosCamas.js'

export function validarRegistroCama(
  body: unknown,
): { habitacion: number; piso: number; idTipoCama: number } {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ErrorRecursosCamas(
      'DATOS_INVALIDOS',
      'Se requiere habitacion, piso e idTipoCama numÃ©ricos.',
    )
  }
  const datos = body as Record<string, unknown>
  const permitidos = new Set(['habitacion', 'piso', 'idTipoCama'])
  if (
    Object.keys(datos).some((campo) => !permitidos.has(campo)) ||
    typeof datos.habitacion !== 'number' ||
    typeof datos.piso !== 'number' ||
    typeof datos.idTipoCama !== 'number'
  ) {
    throw new ErrorRecursosCamas(
      'DATOS_INVALIDOS',
      'SÃ³lo se aceptan habitacion, piso e idTipoCama numÃ©ricos.',
    )
  }
  validarId(datos.habitacion, 'habitacion')
  validarId(datos.piso, 'piso')
  validarId(datos.idTipoCama, 'idTipoCama')
  return {
    habitacion: datos.habitacion,
    piso: datos.piso,
    idTipoCama: datos.idTipoCama,
  }
}
