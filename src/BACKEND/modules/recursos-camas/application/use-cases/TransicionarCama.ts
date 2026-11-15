import type { ITransicionCamaRepository } from '../../domain/repositories/ITransicionCamaRepository.js'
import type { TransicionCamaDTO, TransicionCamaResultadoDTO } from '../dtos/CamasDTO.js'
import { ErrorRecursosCamas, validarId } from '../../domain/errors/ErrorRecursosCamas.js'
import { crearEstadoCama } from '../../domain/states/EstadoCama.js'

// Comandos de higiene y mantenimiento comparten el mismo límite transaccional.
export class TransicionarCama {
  constructor(private readonly camas: ITransicionCamaRepository) {}

  async ejecutar(solicitud: TransicionCamaDTO): Promise<TransicionCamaResultadoDTO> {
    validarId(solicitud.idCama, 'idCama')
    validarId(solicitud.idUsuario, 'idUsuario')
    crearEstadoCama(solicitud.estadoEsperado)
    if (solicitud.accion === 'liberar') {
      validarId(solicitud.idAsignacion, 'idAsignacion')
      if (solicitud.motivo !== 'alta' && solicitud.motivo !== 'traslado') {
        throw new ErrorRecursosCamas('DATOS_INVALIDOS', 'La liberación requiere alta o traslado.')
      }
    }
    const resultado = await this.camas.transicionar(solicitud, (cama) => {
      switch (solicitud.accion) {
        case 'liberar':
          cama.liberar()
          break
        case 'confirmar-limpieza':
          cama.confirmarLimpieza()
          break
        case 'bloquear':
          cama.bloquear()
          break
        case 'finalizar-mantenimiento':
          cama.finalizarMantenimiento()
          break
        default:
          throw new ErrorRecursosCamas('DATOS_INVALIDOS', 'Acción de cama desconocida.')
      }
    })
    return { ...resultado, fechaEgreso: resultado.fechaEgreso?.toISOString() ?? null }
  }
}
