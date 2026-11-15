import type { EjecutorMysql } from './ContratosMysql.js'
import type { ConsumoInsumo } from '../../domain/repositories/IInsumoRepository.js'

// Integración pendiente: el esquema actual NO tiene persistencia para este registro.
export interface RegistroConsumosMysql {
  // Debe registrar en forma durable y atómica usando EXCLUSIVAMENTE esta conexión.
  // Unicidad por administración y por evento, incluso entre procesos concurrentes.
  // Duplicado: misma administración, insumo, cantidad y piso (aunque cambie idEvento).
  // Debe asociar los eventId recibidos a esa administración. Reutilizar un eventId
  // para otra administración o cambiar el consumo debe fallar con CONSUMO_INCONSISTENTE.
  // El registro y el descuento se confirman o revierten en la misma transacción.
  registrarSiNuevo(db: EjecutorMysql, consumo: ConsumoInsumo): Promise<'nuevo' | 'duplicado'>
}
