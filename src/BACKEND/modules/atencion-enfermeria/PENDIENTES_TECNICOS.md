# Pendientes técnicos de Atención de Enfermería

## Administración de medicación

- El repositorio actualiza `insumos.stock` y después inserta en
  `administracion_medicacion`. Si el INSERT falla, intenta devolver la cantidad
  al stock. Esta compensación reduce la inconsistencia, pero no es atómica: si
  también falla la compensación, debe revisarse el stock manualmente.
- La cantidad realmente administrada se usa para descontar stock y se transmite
  en el evento `MedicacionAdministrada`, pero el INSERT actual solo persiste
  `id_indicacion_medica`, `estado`, `id_enfermero` y `fecha_hora`. No hay una
  solución de persistencia verificable con el esquema disponible. Para guardar
  esa cantidad hace falta confirmar una columna existente o autorizar un cambio
  de esquema.
- La compensación del stock también puede dejar una inconsistencia si falla, o
  si el INSERT fue confirmado por MySQL pero la aplicación recibió un error de
  comunicación. Sin transacciones ni una clave de idempotencia confirmada, no
  se puede garantizar el resultado ante esos fallos.
- La protección contra dosis repetidas vuelve a consultar inmediatamente antes
  de actualizar el stock. Sin una restricción única confirmada en MySQL, no se
  puede impedir de forma garantizada que dos solicitudes simultáneas registren
  la misma dosis. No se debe afirmar que esta comprobación es atómica.
- No se encontró un archivo de esquema SQL en el repositorio. Por eso no se pudo
  contrastar si `indicacion_medica.hora_incio` (así aparece escrito en la
  consulta), `indicacion_medica.frecuencia_hora` y el resto de columnas existen
  con esos nombres. Confirmar el esquema real antes de corregir nombres o
  agregar persistencia.

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
