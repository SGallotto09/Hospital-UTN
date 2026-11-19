import type { ICamaRepository } from '../../domain/repositories/ICamaRepository.js'
import { ErrorRecursosCamas, validarId } from '../../domain/errors/ErrorRecursosCamas.js'

export class RegistrarCama {
  constructor(private readonly camas: ICamaRepository) {}

  async ejecutar(datos: unknown): Promise<number> {
    if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
      throw new ErrorRecursosCamas('DATOS_INVALIDOS', 'Completá los datos de la cama.')
    }
    const { habitacion, piso, idTipoCama, estado } = datos as Record<string, unknown>
    validarId(habitacion as number, 'Habitación')
    validarId(idTipoCama as number, 'Tipo de cama')
    if (typeof piso !== 'number' || !Number.isInteger(piso) || piso < -2147483648 || piso > 2147483647) {
      throw new ErrorRecursosCamas('DATOS_INVALIDOS', 'Piso debe ser un número entero válido.')
    }
    if (estado !== undefined && estado !== 'Libre') {
      throw new ErrorRecursosCamas('DATOS_INVALIDOS', 'Las camas nuevas deben estar libres.')
    }
    return this.camas.crear({ habitacion: habitacion as number, piso, idTipoCama: idTipoCama as number })
  }
}
