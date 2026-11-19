# Gestión de Recursos y Camas

## Alta de camas desde el mapa

`+ Nueva cama` abre un panel con habitación, piso y tipo obtenido de MySQL.
`POST /api/recursos-camas/camas` recibe `{ habitacion, piso, idTipoCama }` y
devuelve HTTP 201 con `{ cama: { id, estado: "Libre" } }`. El estado lo fija el
servidor y no se crea ninguna asignación. El mapa se recarga automáticamente y se
limpian sus filtros para mostrar la nueva cama. No se reintenta automáticamente un POST.

`GET /api/recursos-camas/tipos-cama` entrega `{ tipos: [{ id, nombre }] }`.
Ambas operaciones requieren sesión y permiso `camas:crear`, exclusivo de
Administrador. Los otros permisos permanecen iguales; el montaje de sólo lectura
no expone estos endpoints. Los rechazos se muestran en la interfaz.

Habitación y tipo: enteros positivos dentro del rango INT; piso: entero INT,
incluida planta baja y subsuelos. La FK de `tipo_cama` rechaza tipos inexistentes.
Se utiliza una única inserción parametrizada con el ID autogenerado por MySQL.
El esquema real sólo exige unicidad del ID: permite varias camas del mismo tipo
en una habitación/piso. Sin un identificador físico adicional no puede detectarse
un alta repetida como la misma cama; no se inventa esa restricción. Una violación
de índice único de MySQL se traduce a 409. El formulario evita envíos simultáneos.

El esquema y los tipos existentes se inspeccionaron mediante lectura. Las altas
se verifican con conexión simulada; no se insertaron camas de prueba en MySQL real.

Módulo del monolito Hospital-UTN: backend Node.js/Express/TypeScript y frontend Vue 3.
Referencias: historias de usuario y dump `hospital_utn (3).sql` (MySQL 8.0.46).

Integración compartida implementada: servidor Express, sesiones IAM, política de roles aprobada,
withTransaction() y proxy /api. Asignación habilitada mediante el repositorio de Admisión,
sin duplicar SQL de pacientes. La base local ya tiene unicidad activa por cama y paciente.
Ver estado real y pendientes en [integracion/README.md](integracion/README.md).

## Implementado

- HU 1.1: asignación de camas con State, validación de paciente y adaptador MySQL transaccional.
- HU 2.1: liberación por alta/traslado, confirmación de limpieza y mantenimiento.
- HU 3.1: Insumo, validación del evento MedicacionAdministrada, consumidor persistente,
  adaptador con descuento condicionado y consulta de inventario.
- Controladores, validadores y rutas Express con contratos inyectados para IAM y Admisión.
- Mapa Vue con filtros, formularios, manejo de conflictos y recarga desde la API.
- Asignación por DNI: el formulario busca al paciente en Admisión y muestra nombre,
  apellido y DNI antes de confirmar. GET `/api/recursos-camas/pacientes?dni=...`
  exige sesión y `camas:asignar`; devuelve sólo ID, nombre, apellido y DNI.
  Editar el DNI invalida la selección y las respuestas pendientes. El POST conserva
  `{ idCama, idPaciente }`, con las mismas validaciones y restricciones de unicidad.
- Inventario Vue por piso y presentación de resultados externos, sin descuentos manuales.
- Pruebas de dominio, casos de uso, adaptadores, frontend e integración HTTP condicional.

Las escrituras necesitan el proveedor transaccional compartido real. Sin él,
fallan con `TRANSACCIONES_NO_DISPONIBLES`. El consumidor de inventario exige además
un registro durable de consumos: sin él falla con `DEDUPLICACION_NO_DISPONIBLE`,
antes de abrir una transacción o modificar stock. No hay implementaciones simuladas
en producción. El servidor compartido ya conecta productor, persistencia y consumidor.

## Organización

- `domain`: entidades Cama, AsignacionCama e Insumo, State y contratos de repositorios.
- `application`: AsignarCama, TransicionarCama, ProcesarConsumoInsumo, DTOs y contratos de integración.
- `infraestructure`: adaptadores MySQL, mapeo y operaciones SQL compartidas entre repositorios.
- `presentation`: validación HTTP, controlador y rutas.
- `recursosCamas.module.ts`: composición explícita de dependencias.
- `src/FRONTEND/modules/recursos-camas`: frontend, sin imports de los detalles internos del backend.

La consulta del mapa usa IConsultaCamas directamente; no necesita una clase que
sólo delegue. Los DTOs se reúnen en CamasDTO.ts y la entrada de asignación reutiliza
SolicitudAsignacion. Las entidades se utilizan cuando hay reglas de dominio que aplicar.

## HU 3.1: consumo de inventario

Integración final con main 8507413: se conservan Turnos, Triaje, notificaciones
Socket.IO, Facturación y sus estrategias. La recuperación automática de cargos
usa el mismo ciclo del procesador, sin otro temporizador. Lee consumos confirmados
sin cargo asociado y llama al caso de uso de Facturación con la cantidad persistida.
El índice único de cargos por administración impide cargos duplicados concurrentes.
Las consultas se recorren por lotes y vuelven al inicio; un error de cuenta o precio
no bloquea las otras administraciones y se reintenta en vueltas posteriores.
No se utiliza el EventEmitter como fuente de entrega. Sus contratos anteriores
se conservan, pero el arranque no registra el listener en memoria.

Facturación exige administración confirmada y puede recuperar consumos pendientes,
procesados o en revision. No modifica inventario ni impide que el stock se procese
si falla un cargo. Necesita cuenta activa y precio configurado; no se cargan esos
datos automáticamente. El cierre espera también la recuperación en curso antes de
cerrar el pool. Los protocolos existentes usan MyISAM: se conserva su implementación
original y no se presentan como una transacción atómica.

Integración actualizada con Enfermería 7342332: su vista envía cantidad_administrada
en unidades enteras positivas, que deben coincidir con la cantidad indicada. Se valida
en Vue, controlador y repositorio con la indicación bloqueada. Para clientes anteriores
el campo es opcional; al omitirlo se utiliza la cantidad indicada. La respuesta incluye
idAdministracionMedicacion y, cuando se envió, cantidadAdministrada. Se conserva la
persistencia de consumos y no se utiliza EventEmitter para descontar inventario.

Se incorporaron Protocolos y las vistas actuales de Enfermería conservando Alertas,
Admisión, Historia Clínica y Recursos y Camas. Los Builders mantienen sus reglas.
El repositorio de protocolos conserva la persistencia original con limpieza compensatoria;
la creación de protocolo y tareas no constituye una transacción única.

Integración real de backend con Atención y Enfermería, incorporada selectivamente
 desde origin/feature/backend-enfermeria (8800d76), sin su servidor independiente.
La tabla existente consumos_medicacion debe tener id_administracion como PK,
id_insumo, cantidad, piso y estado (pendiente/procesado/revision). No se crean tablas.

- Cantidad representa unidades enteras de inventario por administración, confirmado por el grupo.
- El piso se obtiene de la única cama activa del paciente y queda guardado al registrar.
  Sin cama activa se rechaza el registro. No se recalcula el piso si el paciente se traslada.
- POST /api/administracion-medicacion exige sesión y rol Enfermero; su ID sale de IAM.
  El GET exige sesión. Se conservan validaciones de indicación, frecuencia y horario.
- Enfermería bloquea la indicación y repite la búsqueda de dosis administrada en la
  ventana de ±30 minutos con lectura bloqueada. Se conserva este criterio conservador:
  no hay identidad persistida por horario programado y puede rechazar dosis contiguas
  en el límite de sus ventanas. Todos los productores deben respetar ese bloqueo.
- Administración y consumo pendiente se insertan sobre una única conexión de
  Database.withTransaction(). Enfermería no actualiza insumos. Si falla una inserción,
  ambas se revierten. Su HTTP 200 confirma registro clínico, no descuento ya terminado.

El servidor inicia un procesador después de comenzar a escuchar. Consulta hasta
10 pendientes, uno por vez, y programa otro ciclo 5 segundos después de terminar.
Al cerrar, primero drena HTTP, después detiene y espera el consumidor, y cierra el pool.
No hay tareas superpuestas, brokers ni otro pool/servidor. Reiniciar recupera pendientes.

Cada fila produce MedicacionAdministrada versión 1 con idEvento medicacion:<id_administracion>,
idAdministracion, idInsumo, cantidad y piso. No se admiten alias nuevos para reintentos.
El adaptador concreto exige ese ID estable y compara el contenido con la fila persistida.

ProcesarConsumoInsumo reutiliza MysqlInsumoRepository y el registro persistente:

1. Bloquear el consumo con SELECT FOR UPDATE; un procesado equivalente es duplicado.
2. Marcar procesado dentro de la transacción y bloquear el insumo.
3. Validar cantidad, piso y stock; ejecutar UPDATE insumos con stock >= cantidad y piso.
4. Confirmar la marca y el descuento juntos. Cualquier error revierte ambos.

Ante stock insuficiente o piso incorrecto, después del rollback el procesador cambia
pendiente a revision mediante UPDATE condicionado. Esa actualización bloquea la fila
 y reevalúa su estado, sin pisar un procesado concurrente. Los casos revision no se
reintentan automáticamente; requieren intervención acordada con el grupo. No se borra
la administración clínica ni se agregan endpoints de resolución en este alcance.
Otros fallos se registran y se vuelven a consultar en el siguiente ciclo. Ante un commit
incierto se relee la fila; no se repite una resta aislada. Los errores no detienen el ciclo.

Las consultas de inventario y sus formatos HTTP se conservan. El frontend de Enfermería
actual de esta rama todavía es visual: su conexión a estos endpoints queda pendiente.
No se ejecutaron administraciones ni descuentos reales como parte de esta integración.

## Estados

| Estado previo       | Acción                      | Estado resultante |
| ------------------- | --------------------------- | ----------------- |
| Libre               | Asignar                     | Ocupada           |
| Ocupada             | Liberar por alta o traslado | En limpieza       |
| En limpieza         | Confirmar higiene terminada | Libre             |
| Libre / En limpieza | Bloquear por mantenimiento  | Bloqueada         |
| Bloqueada           | Finalizar mantenimiento     | En limpieza       |

State rechaza las demás combinaciones. Una cama reparada requiere higiene antes
de volver a Libre. Una cama ocupada debe liberarse antes de bloquearse.

## Persistencia y concurrencia

Se usan las tablas existentes `camas`, `tipo_cama` y `asignaciones_camas`.
Se conservó `uq_cama_activa` y se agregó, con autorización y respaldo previo,
`id_paciente_activo` generado + índice único `uq_paciente_activo` en la base local.
Ambas columnas generadas valen NULL al finalizar la asignación, conservando el historial.
No se escriben esas columnas desde el código. Otros entornos necesitan también
`uq_paciente_activo` antes de habilitar asignaciones. Su violación devuelve HTTP 409
con código `PACIENTE_YA_ASIGNADO` y revierte toda la transacción, incluido el estado de cama.

Cada escritura exige una conexión exclusiva y una única transacción:

1. Bloquear la cama con `SELECT ... FOR UPDATE` y aplicar State.
2. Verificar su asignación activa; en transiciones, comprobar también `estadoEsperado`.
3. Asignar o cerrar la ocupación y actualizar el estado con comprobación de filas afectadas.
4. Confirmar todo antes de devolver éxito; ante errores, revertir todo.

La liberación exige `idAsignacion`: una solicitud vieja no debe cerrar otra ocupación.
Cierra esa fila con `fecha_egreso = CURRENT_TIMESTAMP` y cambia la cama a En limpieza.
Las demás transiciones rechazan camas con asignación activa. No se borra historial.
Las fechas de ingreso/egreso se leen de MySQL y se serializan como ISO; el proveedor
debe devolver DATETIME como Date y usar una convención horaria acordada.

La lectura normaliza singular/plural y mayúsculas de los estados, rechaza valores
desconocidos y no ofrece Libre como disponible si tiene asignación activa.
Los POST no se reintentan automáticamente cuando su resultado es incierto.

## API y permisos

Prefijo: `/api/recursos-camas`. El usuario se obtiene del contexto autenticado de IAM,
nunca del body. Los IDs deben ser enteros positivos compatibles con INT MySQL.

| Método y ruta                               | Body                                       | Permiso                | Respuesta            |
| ------------------------------------------- | ------------------------------------------ | ---------------------- | -------------------- |
| GET `/camas`                                | —                                          | `camas:consultar`      | 200 `{ camas }`      |
| GET `/insumos`                              | —                                          | `inventario:consultar` | 200 `{ insumos }`    |
| POST `/asignaciones`                        | `{ idCama, idPaciente }`                   | `camas:asignar`        | 201 `{ asignacion }` |
| POST `/camas/:idCama/liberacion`            | `{ estadoEsperado, idAsignacion, motivo }` | `camas:liberar`        | 200 `{ transicion }` |
| POST `/camas/:idCama/confirmacion-limpieza` | `{ estadoEsperado }`                       | `camas:limpiar`        | 200 `{ transicion }` |
| POST `/camas/:idCama/bloqueo`               | `{ estadoEsperado }`                       | `camas:mantener`       | 200 `{ transicion }` |
| POST `/camas/:idCama/fin-mantenimiento`     | `{ estadoEsperado }`                       | `camas:mantener`       | 200 `{ transicion }` |

`motivo` acepta alta o traslado. Se rechazan campos adicionales. El mapa incluye
`idAsignacionActiva`; la transición devuelve `idCama`, `estadoAnterior`, `estado`,
`idAsignacionFinalizada` y `fechaEgreso` (ISO o null). Los errores de negocio tienen
formato `{ codigo, mensaje }`, con estados 400/401/403/404/409/503 según el caso.
El consumo no se expone como POST público: se recibe por el callback interno.
Sus errores se propagan al despachador. No hay un botón de descuento manual.

## Pendiente de integración

- **MySQL:** withTransaction() ya entrega una conexión exclusiva del pool compartido.
  No ejecutar BEGIN/COMMIT mediante query(). Verificación contra MySQL real pendiente.
- **Dependencias:** instaladas según el manifest recibido de main, sin modificar
  manifests ni lockfiles. No se añadieron dependencias.
- **IAM:** la sesión real y los permisos aprobados ya están conectados al servidor.
  Falta conectar el login visual a su API y proporcionar contexto de permisos a Vue.
- **Enfermería e inventario:** backend integrado con pendientes persistidos. Faltan
  pruebas reales de administración, reinicio y concurrencia y resolución operativa de revision.
- **Admisión:** gateway integrado con MySQLPacienteRepository.buscarPorId(). La FK sigue
  protegiendo integridad si el paciente desaparece después de la validación.
- **Altas y traslados:** integrar el comando con el proceso clínico real. La liberación
  operativa no registra un alta médica ni asigna el destino de un traslado.
- **Arranque:** rutas protegidas montadas, proxy /api configurado y errores globales JSON.
  Asignación montada con Admisión; su prueba completa y concurrente en MySQL real sigue pendiente.
- **Frontend:** rutas en src/router/index.ts; login visual pendiente de IAM.
- **Monitores:** actualización manual o posterior al comando; no hay eventos durables
  ni actualización en tiempo real entre clientes.
- **Auditoría:** el esquema permite estado actual y fecha de egreso, pero no actor,
  motivo ni fechas de limpieza/mantenimiento. Esos datos no se guardan ni se simulan.
- **Versionado e idempotencia:** no hay versión/tarea persistida para reconocer todos
  los ciclos que vuelven al mismo estado ni registro durable de solicitudes repetidas.
- **Asignaciones por paciente:** unicidad activa protegida por `uq_paciente_activo` en la base local.
  No se ejecutaron asignaciones de prueba contra MySQL real.

## Verificación

Resultado actual del módulo: **382 pruebas aprobadas, sin omisiones** (20 archivos).
Enfermería: **13 pruebas aprobadas** de protocolos y vista de medicación (2 archivos).
TypeScript del módulo, frontend y servidor comprobado. Concurrencia MySQL real pendiente.
Integración final: **432 pruebas aprobadas en 33 archivos**, ejecutadas desde `src`
para excluir las pruebas compiladas que puede generar TypeScript en `dist`.
TypeScript global y backend, ESLint de archivos integrados y Vite aprobados.
ESLint global detecta siete errores preexistentes en repositorios de Admisión,
SocketTypes y useNotificaciones; esos archivos no se modifican en esta integración.

Desde la raíz:

```powershell
node node_modules/vitest/vitest.mjs run --config src/BACKEND/modules/recursos-camas/vitest.config.ts --configLoader runner
node node_modules/eslint/bin/eslint.js src/BACKEND/modules/recursos-camas src/FRONTEND/modules/recursos-camas
node node_modules/vue-tsc/bin/vue-tsc.js --noEmit -p src/BACKEND/modules/recursos-camas/tsconfig.core.json
node node_modules/vue-tsc/bin/vue-tsc.js --noEmit -p src/BACKEND/modules/recursos-camas/tsconfig.module.json
```

La comprobación core cubre dominio, aplicación, validadores y frontend. La completa
incluye adaptadores y HTTP y necesita las dependencias mencionadas. No se agregan
stubs de tipos para ocultar faltantes. La suite HTTP se omite explícitamente si no
está instalado Express; usa un servidor real con puertos de prueba.

Los adaptadores se prueban con respuestas SQL programadas: verifican consultas y
propagación de errores, pero no demuestran aislamiento ni rollback reales. La suite
Vue incluye componentes y cliente HTTP con respuestas de red controladas.

Al integrar MySQL, verificar con conexiones independientes: dos asignaciones sobre
una cama; liberación contra asignación; bloqueo contra limpieza; cierre de ocupación
y cambio de estado con rollback; solicitudes repetidas/desactualizadas y fallos de
commit. Usar fixtures acordadas en una base de pruebas, sin crear tablas desde los tests.
Para inventario, verificar consumos concurrentes sin stock negativo, eventos y
administraciones duplicados entre procesos/reinicios, reutilización de claves con
datos diferentes y rollback conjunto del registro y el stock. Las pruebas de consumo
entre componentes usan SQL y registro controlados: no acreditan deduplicación durable,
entrega asíncrona real ni aislamiento de MySQL.
