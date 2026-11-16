import { ErrorRecursosCamas, validarId } from '../errors/ErrorRecursosCamas.js'

export class AsignacionCama {
  private readonly ingreso: Date

  constructor(
    public readonly id: number,
    public readonly idCama: number,
    public readonly idPaciente: number,
    public readonly idUsuarioAsignador: number,
    fechaIngreso: Date,
  ) {
    for (const [campo, valor] of Object.entries({ id, idCama, idPaciente, idUsuarioAsignador })) {
      validarId(valor, campo)
    }
    if (!(fechaIngreso instanceof Date) || Number.isNaN(fechaIngreso.getTime())) {
      throw new ErrorRecursosCamas('DATOS_INVALIDOS', 'La fecha de ingreso no es válida.')
    }
    this.ingreso = new Date(fechaIngreso)
  }

  get fechaIngreso(): Date {
    return new Date(this.ingreso)
  }
}
