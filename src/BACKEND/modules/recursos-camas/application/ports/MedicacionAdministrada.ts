import type {
  ConsumoInsumo,
  ResultadoConsumo,
} from '../../domain/repositories/IInsumoRepository.js'

// Contrato público con Enfermería. cantidad se expresa en unidades enteras de stock.
// El productor persiste el consumo junto a la administración; idEvento se reconstruye
// como `medicacion:${idAdministracion}`. piso proviene de su asignación activa al registrar.
export interface MedicacionAdministrada extends ConsumoInsumo {
  tipo: 'MedicacionAdministrada'
  version: 1
}

// El despachador real debe esperar la Promise antes de confirmar entrega.
export type ConsumidorMedicacionAdministrada = (evento: unknown) => Promise<ResultadoConsumo>
