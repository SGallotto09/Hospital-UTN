import { ErrorRecursosCamas, validarId } from '../../domain/errors/ErrorRecursosCamas.js'

export function validarAsignacion(body: unknown): { idCama: number; idPaciente: number } {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ErrorRecursosCamas(
      'DATOS_INVALIDOS',
      'Se requiere un objeto con idCama e idPaciente.',
    )
  }
  const datos = body as Record<string, unknown>
  if (
    Object.keys(datos).some((campo) => campo !== 'idCama' && campo !== 'idPaciente') ||
    typeof datos.idCama !== 'number' ||
    typeof datos.idPaciente !== 'number'
  ) {
    throw new ErrorRecursosCamas(
      'DATOS_INVALIDOS',
      'Sólo se aceptan idCama e idPaciente numéricos.',
    )
  }
  validarId(datos.idCama, 'idCama')
  validarId(datos.idPaciente, 'idPaciente')
  return { idCama: datos.idCama, idPaciente: datos.idPaciente }
}
