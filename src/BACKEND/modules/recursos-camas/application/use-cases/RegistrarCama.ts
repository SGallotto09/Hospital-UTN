import { validarId } from '../../domain/errors/ErrorRecursosCamas.js'
import type {
  DatosRegistroCama,
  IRegistroCamaRepository,
} from '../../domain/repositories/IRegistroCamaRepository.js'
import type { Cama } from '../../domain/entities/Cama.js'

export class RegistrarCama {
  constructor(private readonly camas: IRegistroCamaRepository) {}

  async ejecutar(datos: DatosRegistroCama): Promise<Cama> {
    validarId(datos.habitacion, 'habitacion')
    validarId(datos.piso, 'piso')
    validarId(datos.idTipoCama, 'idTipoCama')
    return this.camas.registrar(datos)
  }
}
