# Gestión de Recursos y Camas

Módulo del monolito Hospital-UTN: backend Node.js/Express/TypeScript y frontend Vue 3.
Referencias: historias de usuario y dump `hospital_utn (3).sql` (MySQL 8.0.46).

Primera integración de lectura: las consultas productivas se verificaron contra
MySQL real; la base actual contiene **0 camas y 0 insumos**. El montaje HTTP de
sólo lectura está preparado, pero siguen pendientes IAM, Express compartido y proxy.
Ver diagnóstico, propuestas no aplicadas y pasos en [integracion/README.md](integracion/README.md).

## Implementado

- HU 1.1: asignación de camas con State, validación de paciente y adaptador MySQL transaccional.
- HU 2.1: liberación por alta/traslado, confirmación de limpieza y mantenimiento.
- HU 3.1: Insumo, validación del evento MedicacionAdministrada, consumidor preparado,
  adaptador con descuento condicionado y consulta de inventario.
- Controladores, validadores y rutas Express con contratos inyectados para IAM y Admisión.
- Mapa Vue con filtros, formularios, manejo de conflictos y recarga desde la API.
- Inventario Vue por piso y presentación de resultados externos, sin descuentos manuales.
- Pruebas de dominio, casos de uso, adaptadores, frontend e integración HTTP condicional.

Las escrituras necesitan el proveedor transaccional compartido real. Sin él,
fallan con `TRANSACCIONES_NO_DISPONIBLES`. El consumidor de inventario exige además
un registro durable de consumos: sin él falla con `DEDUPLICACION_NO_DISPONIBLE`,
antes de abrir una transacción o modificar stock. No hay implementaciones simuladas
en producción. La recepción automática desde Enfermería todavía no está conectada.

## Organización

- `domain`: entidades Cama, AsignacionCama e Insumo, State y contratos de repositorios.
- `application`: AsignarCama, TransicionarCama, ProcesarConsumoInsumo, DTOs y contratos de integración.
- `infraestructure`: adaptadores MySQL, mapeo y operaciones SQL compartidas entre repositorios.
- `presentation`: validación HTTP, controlador y rutas.
- `recursosCamas.module.ts`: composición explícita de dependencias.
- `src/modules/recursos-camas`: frontend, sin imports de los detalles internos del backend.

La consulta del mapa usa IConsultaCamas directamente; no necesita una clase que
sólo delegue. Los DTOs se reúnen en CamasDTO.ts y la entrada de asignación reutiliza
SolicitudAsignacion. Las entidades se utilizan cuando hay reglas de dominio que aplicar.

## HU 3.1: consumo de inventario

La historia original exige descontar insumos del piso cuando Enfermería administra
medicación: por ejemplo, 50 unidades de Ibuprofeno pasan a 49. Se utiliza la tabla
existente `insumos(id, nombre, stock, piso)`, sin cambios SQL ni migraciones.

Insumo valida stock entero no negativo, cantidad positiva y coincidencia de piso.
El piso 0 y los pisos negativos son enteros válidos; un insumo sin piso (NULL) no
se usa como reemplazo del inventario de un piso. No se elige una fila por nombre.

Contrato público en `application/ports/MedicacionAdministrada.ts`:

```json
{
  "tipo": "MedicacionAdministrada",
  "version": 1,
  "idEvento": "medicacion-20",
  "idAdministracion": 20,
  "idInsumo": 4,
  "cantidad": 1,
  "piso": 2
}
```

Enfermería debe emitirlo sólo al confirmar una administración real. idAdministracion
identifica esa dosis de forma estable; idEvento identifica el evento y se conserva
en los reintentos. La cantidad representa unidades enteras de stock (no miligramos
ni la dosis escrita como texto). Enfermería debe acordar la conversión y enviar el
idInsumo de la fila del piso de consumo, incluso si el paciente luego fue trasladado.
El contrato es una propuesta para coordinar con el productor, no una integración
ya implementada en su módulo. El canal interno debe confiar sólo en el productor
autorizado; comprobar tipo/version no autentica por sí solo un evento.

ProcesarConsumoInsumo recibe y valida el evento, y delega en IInsumoRepository.
`crearConsumidorConsumos({ database, transacciones, registroConsumos })` exporta
un callback que devuelve una Promise de ResultadoConsumo. No se crea servidor,
broker, worker independiente, setTimeout ni suscripción ficticia.

El adaptador MysqlInsumoRepository ejecuta en una transacción exclusiva:

1. Registrar el consumo mediante RegistroConsumosMysql usando la misma conexión.
2. Si ya estaba procesado con el mismo contenido, devolver duplicado sin tocar stock.
3. Leer el insumo con FOR UPDATE y validar las reglas de Insumo.
4. Ejecutar la resta condicionada y exigir exactamente una fila afectada:

```sql
UPDATE insumos SET stock = stock - ?
WHERE id = ? AND piso = ? AND stock >= ?
```

Los parámetros son cantidad, idInsumo, piso y cantidad, previamente validados.
El descuento propio no puede producir stock negativo. Registro y descuento deben
confirmarse juntos; cualquier error debe revertir ambos. No se confirma éxito antes
del commit ni se reintenta una escritura con resultado incierto desde este módulo.

Resultado: estado descontado/duplicado, idEvento, idAdministracion, idInsumo,
cantidadDescontada y stockRestante. Un duplicado descuenta 0 y devuelve stockRestante
null: no inventa el stock histórico ni afirma haberlo vuelto a consultar.

### Deduplicación y entrega asíncrona pendientes

La tabla insumos no registra consumos ni eventos procesados. RegistroConsumosMysql
es únicamente un contrato pendiente, sin implementación sobre tablas inexistentes.
Su implementación futura debe garantizar unicidad concurrente por administración
y por evento, incluso entre procesos y reinicios. Debe comparar administración,
insumo, cantidad y piso; un reenvío equivalente con otro eventId sigue siendo duplicado.
Debe asociar esos eventId a la administración. Reutilizar un eventId para otra dosis
o cambiar el contenido devuelve CONSUMO_INCONSISTENTE, sin nuevo descuento.

No alcanza con consultar primero si existe: registro y unicidad necesitan una
garantía durable y la misma transacción que el stock. No se utiliza un Set, mapa,
cache ni la tabla de administraciones de otro módulo como sustituto. El esquema
necesario se discutirá con el grupo; aquí no se crea ni se ejecuta.

El despachador compartido debe registrar el callback y esperar su Promise antes
de confirmar entrega. Enfermería necesita publicar de forma durable junto con el
registro de administración y entregar después del commit para evitar eventos
perdidos o consumos de administraciones revertidas. Eso requiere coordinación
con su módulo y la infraestructura, que no se modificaron. Una función async por
sí sola no garantiza publicación, entrega ni recuperación después de una caída.

Los errores transitorios se devuelven al despachador para su política de reintentos.
Stock insuficiente, piso incorrecto o datos inconsistentes requieren una incidencia
operativa; no se reintentan indefinidamente ni revierten una administración clínica.
El registro no debe marcar el consumo como completado si el descuento falló.

La lectura GET /insumos funciona independientemente de registro y transacciones.
InventarioView muestra existencias por piso, permite actualizar y admite entradas
resultadoConsumo/errorConsumo para futuras notificaciones. No hay historial durable
ni conexión real de esas notificaciones; recargar la página no recupera resultados
desde insumos. La tabla se actualiza consultando la API, nunca restando localmente.
La ruta Vue exportada es `/recursos-camas/inventario`; aún debe montarse con el router global.

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
No se crean tablas ni se ejecutan migraciones. El índice `uq_cama_activa` ya existe;
no se escribe su columna generada `id_cama_activa`.

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

- **MySQL:** Database actual sólo permite lectura segura para este uso. El contrato
  ProveedorTransaccionesMysql requiere conexión exclusiva, BEGIN/COMMIT/ROLLBACK y
  liberación en finally. No usar BEGIN y COMMIT como queries sobre la conexión única
  compartida. Falta verificar bloqueos, rollback y concurrencia contra MySQL real.
- **Dependencias:** instalar/coordinar Express y sus tipos. mysql2 y tsx ya están
  instalados según el manifest existente. El manifest local es temporal; no se
  modificó el package.json ni el lockfile global.
- **IAM:** implementar ObtenerActor con identidad verificada y permisos. La ocultación
  de acciones por permisos en el frontend depende del contexto de sesión del grupo.
  La lectura de inventario añade el permiso `inventario:consultar`.
- **Enfermería e inventario:** acordar el evento, entrega durable, registro transaccional
  de consumos y canal de resultados. Sin ese registro el consumidor no escribe stock.
- **Admisión:** implementar IPacienteGateway mediante su API pública. La FK sigue
  protegiendo integridad si el paciente desaparece después de la validación.
- **Altas y traslados:** integrar el comando con el proceso clínico real. La liberación
  operativa no registra un alta médica ni asigna el destino de un traslado.
- **Arranque:** montar crearModuloRecursosCamas con express.json(), autenticación y un
  manejador global de errores inesperados que responda 500 JSON sin exponer SQL.
- **Frontend:** incorporar recursosCamasRoutes al MainLayout, agregar navegación y
  configurar `/api` en el mismo origen o mediante el proxy acordado.
- **Monitores:** actualización manual o posterior al comando; no hay eventos durables
  ni actualización en tiempo real entre clientes.
- **Auditoría:** el esquema permite estado actual y fecha de egreso, pero no actor,
  motivo ni fechas de limpieza/mantenimiento. Esos datos no se guardan ni se simulan.
- **Versionado e idempotencia:** no hay versión/tarea persistida para reconocer todos
  los ciclos que vuelven al mismo estado ni registro durable de solicitudes repetidas.
- **Asignaciones por paciente:** el esquema garantiza una ocupación activa por cama,
  pero no impide varias camas para un paciente; requiere acuerdo si se exige esa regla.

## Verificación

Resultado tras preparar la integración de lectura: **216 pruebas aprobadas y 25 HTTP omitidas**
por falta de Express (13 archivos aprobados y 1 omitido). Se conservaron los escenarios anteriores.
ESLint y TypeScript core aprobados.
TypeScript completo sigue bloqueado por `express` y sus tipos. Las lecturas se
verificaron contra MySQL real; la concurrencia de escrituras sigue pendiente.

Desde la raíz:

```powershell
node node_modules/vitest/vitest.mjs run --config src/BACKEND/modules/recursos-camas/vitest.config.ts --configLoader runner
node node_modules/eslint/bin/eslint.js src/BACKEND/modules/recursos-camas src/modules/recursos-camas
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
