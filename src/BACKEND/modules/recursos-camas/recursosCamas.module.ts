import type { Database } from '../../database/connectionDB.js'
import type { IPacienteGateway } from './application/ports/IPacienteGateway.js'
import { AsignarCama } from './application/use-cases/AsignarCama.js'
import { ConsultaMysqlCompartida } from './infraestructure/database/ConsultaMysqlCompartida.js'
import type { ProveedorTransaccionesMysql } from './infraestructure/database/ContratosMysql.js'
import { MysqlAsignacionCamaRepository } from './infraestructure/repositories/MysqlAsignacionCamaRepository.js'
import { MysqlConsultaCamas } from './infraestructure/repositories/MysqlConsultaCamas.js'
import { CamasController, type ObtenerActor } from './presentation/controlers/CamasController.js'
import { crearRecursosCamasRouter } from './presentation/routes/recursosCamas.routes.js'
import { TransicionarCama } from './application/use-cases/TransicionarCama.js'
import { MysqlTransicionCamaRepository } from './infraestructure/repositories/MysqlTransicionCamaRepository.js'
import { MysqlInsumoRepository } from './infraestructure/repositories/MysqlInsumoRepository.js'
import type { RegistroConsumosMysql } from './infraestructure/database/RegistroConsumosMysql.js'
import { InventarioController } from './presentation/controlers/InventarioController.js'
import { ProcesarConsumoInsumo } from './application/use-cases/ProcesarConsumoInsumo.js'
import type { ConsumidorMedicacionAdministrada } from './application/ports/MedicacionAdministrada.js'

export interface DependenciasRecursosCamas {
  database: Pick<Database, 'query'>
  pacientes: IPacienteGateway
  obtenerActor: ObtenerActor
  transacciones?: ProveedorTransaccionesMysql
  registroConsumos?: RegistroConsumosMysql
}

function crearRepositorioInsumos(
  deps: Pick<DependenciasRecursosCamas, 'database' | 'transacciones' | 'registroConsumos'>,
) {
  return new MysqlInsumoRepository(
    new ConsultaMysqlCompartida(deps.database),
    deps.transacciones,
    deps.registroConsumos,
  )
}

// Se entrega al despachador compartido: no crea una cola ni suscribe eventos ficticios.
export function crearConsumidorConsumos(
  deps: Pick<DependenciasRecursosCamas, 'database' | 'transacciones' | 'registroConsumos'>,
): ConsumidorMedicacionAdministrada {
  const procesar = new ProcesarConsumoInsumo(crearRepositorioInsumos(deps))
  return (evento) => procesar.ejecutar(evento)
}

// Primera etapa: sólo GET. No exige un gateway ficticio de Admisión ni habilita escrituras.
export function crearModuloLecturaRecursosCamas(
  deps: Pick<DependenciasRecursosCamas, 'database' | 'obtenerActor'>,
) {
  const lectura = new ConsultaMysqlCompartida(deps.database)
  const camas = new CamasController(
    new MysqlConsultaCamas(lectura),
    undefined,
    deps.obtenerActor,
    undefined,
  )
  const inventario = new InventarioController(new MysqlInsumoRepository(lectura), deps.obtenerActor)
  return crearRecursosCamasRouter(camas, inventario, true)
}

// Se monta en /api/recursos-camas desde el arranque compartido (integración pendiente).
// No crea conexiones ni reemplaza silenciosamente el proveedor transaccional faltante.
export function crearModuloRecursosCamas(deps: DependenciasRecursosCamas) {
  const consultaCamas = new MysqlConsultaCamas(new ConsultaMysqlCompartida(deps.database))
  const asignar = new AsignarCama(
    new MysqlAsignacionCamaRepository(deps.transacciones),
    deps.pacientes,
  )
  const transicionar = new TransicionarCama(new MysqlTransicionCamaRepository(deps.transacciones))
  return crearRecursosCamasRouter(
    new CamasController(consultaCamas, asignar, deps.obtenerActor, transicionar),
    new InventarioController(crearRepositorioInsumos(deps), deps.obtenerActor),
  )
}
