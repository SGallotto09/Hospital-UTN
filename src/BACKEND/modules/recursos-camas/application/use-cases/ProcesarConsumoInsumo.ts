import type {
  IInsumoRepository,
  ResultadoConsumo,
} from '../../domain/repositories/IInsumoRepository.js'
import type { MedicacionAdministrada } from '../ports/MedicacionAdministrada.js'
import { ErrorRecursosCamas, validarId } from '../../domain/errors/ErrorRecursosCamas.js'
import { validarCantidad, validarPiso } from '../../domain/entities/Insumo.js'

export class ProcesarConsumoInsumo {
  constructor(private readonly insumos: IInsumoRepository) {}

  async ejecutar(datos: unknown): Promise<ResultadoConsumo> {
    if (typeof datos !== 'object' || datos === null || Array.isArray(datos)) {
      throw new ErrorRecursosCamas('DATOS_INVALIDOS', 'El evento de medicación no es válido.')
    }
    const evento = datos as Partial<MedicacionAdministrada>
    if (
      evento.tipo !== 'MedicacionAdministrada' ||
      evento.version !== 1 ||
      typeof evento.idEvento !== 'string' ||
      !evento.idEvento.trim() ||
      evento.idEvento !== evento.idEvento.trim() ||
      typeof evento.idAdministracion !== 'number' ||
      typeof evento.idInsumo !== 'number' ||
      typeof evento.cantidad !== 'number' ||
      typeof evento.piso !== 'number'
    ) {
      throw new ErrorRecursosCamas(
        'DATOS_INVALIDOS',
        'Se requiere un evento MedicacionAdministrada versión 1 completo.',
      )
    }
    validarId(evento.idAdministracion, 'idAdministracion')
    validarId(evento.idInsumo, 'idInsumo')
    validarCantidad(evento.cantidad)
    validarPiso(evento.piso)
    return this.insumos.procesarConsumo({
      idEvento: evento.idEvento,
      idAdministracion: evento.idAdministracion,
      idInsumo: evento.idInsumo,
      cantidad: evento.cantidad,
      piso: evento.piso,
    })
  }
}
