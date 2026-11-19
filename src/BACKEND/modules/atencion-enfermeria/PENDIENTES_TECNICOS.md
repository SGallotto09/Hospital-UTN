# Pendientes técnicos de Atención de Enfermería

## Administración de medicación

- Atención y Enfermería no descuenta stock. Guarda primero la administración y luego un consumo `pendiente`; Recursos-Camas procesa ese consumo y es el único módulo que realiza el descuento.
- Si falla el INSERT del consumo, el repositorio consulta `consumos_medicacion` por `id_administracion`. Solo considera completada la operación si encuentra exactamente una fila con insumo, cantidad y piso esperados. No elimina la administración clínica. Una lectura sin filas es solo una observación de ausencia en ese momento; si la lectura también falla, el resultado del INSERT queda indeterminado.
- El GET de medicaciones detecta y registra las administraciones `Administrada` sin fila de consumo. No las reconstruye automáticamente: la administración no persiste cantidad, insumo, piso ni asignación de cama históricos. Usar los valores actuales de indicación o cama podría crear un consumo incorrecto y provocar un doble descuento. El diagnóstico corre cuando se consulta el listado, no es un worker autónomo.
- La comprobación de dosis existente sigue siendo una consulta por indicación y ventana de ±30 minutos. No hay en este repositorio ni en un esquema verificado una garantía que serialice solicitudes simultáneas en una o varias instancias.
- El registro de signos vitales y la creación de protocolos verifican que el paciente tenga exactamente una asignación activa antes de persistir. La comprobación y el INSERT son escrituras separadas, por lo que no eliminan una carrera con un egreso concurrente.
- Pacientes Internados y el dashboard leen el último signo vital ocurrido desde el ingreso a la asignación activa. El GET de historial por paciente conserva el historial disponible.
- La pantalla de Alertas deriva las temperaturas superiores a 39 °C del endpoint existente del dashboard; no crea alertas de muestra ni persiste una resolución.
- La búsqueda de pacientes ignora respuestas HTTP antiguas si una consulta más reciente ya terminó, evitando que resultados atrasados reemplacen el filtro actual.
- Se valida cantidad contra la indicación y se comprueba stock antes de guardar, pero esa lectura no reserva stock. El inventario puede agotarse antes del procesamiento; Recursos-Camas envía esos consumos a revisión.
- No se encontró un archivo de esquema SQL y no fue posible consultar `information_schema` desde el entorno durante la implementación. No se afirma que `consumos_medicacion.id_administracion` sea único; debe confirmarlo el responsable de la base antes de depender de ello.

## Protocolos

- Al fallar la inserción de una tarea, el repositorio elimina explícitamente las
  tareas ya insertadas para ese protocolo y luego intenta eliminar el protocolo.
  No depende de `ON DELETE CASCADE`. Como son operaciones separadas y no se usan
  transacciones, un fallo durante la limpieza todavía puede dejar registros
  incompletos; el error de limpieza se informa en el log.

## Integraciones pendientes

- La integración de `MedicacionAdministrada` con Facturación corresponde al
  módulo de Facturación y requiere coordinación con su responsable.
- La generación automática de protocolos sigue pendiente hasta que el módulo
  responsable del ingreso confirme un evento/contrato que identifique el ingreso
  y su motivo real.

## Internaciones y generación de protocolos

Se inspeccionó la base MySQL configurada mediante consultas de solo lectura a
`information_schema`. El esquema actual informa estos campos para
`asignaciones_camas`:

- `id` (`PRIMARY KEY`, autoincremental), `id_paciente`, `id_cama`,
  `fecha_ingreso` (`DATETIME`, no nulo), `fecha_egreso` (`DATETIME`, nullable) y
  `id_usuario_asignador`.
- `id_paciente_activo` es una columna generada como `id_paciente` cuando
  `fecha_egreso IS NULL`, y `NULL` en otro caso. Tiene el índice único
  `uq_paciente_activo`. `id_cama_activa` aplica la misma regla a `id_cama` y
  tiene el índice único `uq_cama_activa`.
- Por lo tanto, la base impide más de una asignación activa por paciente y por
  cama. La consulta de Enfermería ya lee directamente `asignaciones_camas` y
  usa `fecha_egreso IS NULL`; no hace falta añadir eventos para listar pacientes
  internados. En la inspección, el conteo de asignaciones activas y el de
  pacientes activos coincidieron (1 y 1).

No se encontró un campo `motivo_ingreso` en el esquema. `triaje` tiene
`nivel_urgencia`, `observaciones` y `fecha_hora_ingreso`; `lista_espera` tiene
fechas y estado; `evoluciones_medicas` tiene `diagnostico` como texto libre. Son
datos clínicos relacionados con el paciente, pero ninguno está definido como el
motivo de esa asignación de cama. No es seguro convertirlos automáticamente a
`Prequirurgico` o `Neumonia`.

`protocolos_atencion` contiene únicamente `id`, `id_paciente`, `tipo_protocolo`
y `fecha_generacion`. No contiene `id_asignacion_cama`, ni existe una
restricción única que vincule un protocolo a una internación. `id` y
`fecha_ingreso` permiten detectar/ordenar asignaciones nuevas al consultar
MySQL, pero por sí solos no proporcionan un vínculo persistente y seguro entre
esa asignación y el protocolo. Comparar fechas puede servir como heurística,
pero no garantiza deduplicación: no hay una clave foránea o restricción única
que impida dos generaciones concurrentes para la misma asignación.

Para completar la automatización, el módulo responsable del ingreso debe
confirmar un contrato que emita después de guardar la asignación: `id` de
asignación, `id_paciente`, `fecha_ingreso` y un `motivo_ingreso` controlado que
corresponda a los protocolos admitidos. También debe acordarse una forma
persistentemente única de asociar el protocolo a `id_asignacion_cama` (por
ejemplo, una columna/restricción confirmada por el responsable del esquema).
Hasta que ese contrato y el vínculo persistente existan, se conserva la
generación manual y no se genera un motivo por inferencia.

## Revisión y cambios de autoría

- La ruta POST de medicación obtiene ahora `id_enfermero` de `req.session.usuarioId`;
  el controlador no lee ese campo del body. Los signos vitales usan la misma regla.
- La administración y su fila de consumo se guardan con dos escrituras. Si falla el INSERT del consumo, se consulta su estado y nunca se borra la administración clínica; si la consulta no encuentra la fila o no logra determinar el resultado, queda para revisión. La detección al consultar medicaciones no reconstruye consumos automáticamente por falta de snapshots históricos confiables.
- `MedicacionAdministrada` se emite después de guardar la administración y el
  consumo. El servidor no registra hoy `MedicacionAdministradaListener`; el
  cobro funciona mediante el procesador de Facturación que recupera consumos
  persistidos. Registrar también el listener sin deduplicación durable podría
  competir con ese procesador y duplicar cargos. El responsable de Facturación
  debe acordar una única vía o una deduplicación durable antes de activar ambos.
- La protección de dosis repetidas conserva una consulta previa y una segunda
  comprobación al guardar, pero no hay restricción única confirmada que cierre
  la carrera entre dos solicitudes concurrentes.
- El dashboard ahora exige rol `Enfermero`, al igual que las rutas operativas.
  Signos vitales responde 400 ante valores inválidos, 401 sin identidad de
  sesión, 403 mediante IAM y 500 ante errores reales de persistencia. La búsqueda
  de pacientes no consulta admisión para convertir IDs válidos pero inexistentes
  en 404; ese contrato debe acordarse si se requiere esa distinción.
- La creación de protocolos requiere una asignación activa única y guarda protocolo y tareas en escrituras separadas. Si falla una tarea, intenta limpiar los registros recién creados e informa los errores de limpieza. Sin transacciones, la compensación no es atómica. Repetir el estado actual de una tarea existente se acepta como operación idempotente.
- Se agregaron pruebas unitarias y HTTP con dependencias simuladas/controladas.
  No prueban persistencia en MySQL real, despliegue, ni una solicitud visual en
  un navegador conectado a la base compartida.
