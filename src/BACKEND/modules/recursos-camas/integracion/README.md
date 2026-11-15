# Integración funcional: primera etapa

## Verificado contra MySQL real

El diagnóstico `verificarLecturas.ts` utiliza exclusivamente Database.getInstance(),
ConsultaMysqlCompartida y los repositorios productivos MysqlConsultaCamas/MysqlInsumoRepository.
No crea una conexión aparte, no levanta un servidor ni escribe SQL de modificación.

Resultado de esta sesión: **0 camas, 0 camas disponibles y 0 insumos** en la base
hospital_utn configurada por la conexión compartida. Ambas consultas finalizaron
correctamente. No se insertaron datos para llenar las pantallas ni para probar filtros.
Los filtros con filas y los estados vacíos se verifican con pruebas de frontend;
la verificación con filas reales queda pendiente de datos que el grupo autorice cargar.

Ejecutar desde la raíz:

```powershell
node --import tsx src/BACKEND/modules/recursos-camas/integracion/verificarLecturas.ts
```

El script termina su proceso al finalizar porque Database actual no ofrece cierre.
No debe importarse desde el servidor. No autentica por HTTP ni sustituye a IAM.

Dependencias constatadas tras instalar las ya declaradas, sin modificar manifests
ni lockfiles: Node 26.13.0, TypeScript 6.0.3, mysql2 3.24.6 y tsx 4.23.15. Express
todavía no está instalado ni declarado globalmente; sus tipos tampoco están disponibles.

## Montaje de lectura preparado

`crearModuloLecturaRecursosCamas({ database, obtenerActor })` exporta un router con
GET /camas y GET /insumos. Se monta bajo /api/recursos-camas en la aplicación
compartida. Reutiliza consultas, controladores y permisos existentes y no requiere
un gateway de Admisión para leer. No registra rutas POST de asignación/transición.
Los controladores también rechazan invocaciones de escritura no configuradas.

El montaje completo `crearModuloRecursosCamas` mantiene sus rutas actuales. No se
modifica IAM, no hay usuario fijo ni middleware de autenticación alternativo.

El grupo confirmó que IAM sólo tiene un login visual y decidirá su integración.
Hasta recibir ObtenerActor y un middleware de autenticación reales, HTTP debe
continuar rechazando solicitudes sin identidad/permisos. Una cabecera enviada por
el navegador no constituye por sí sola una identidad autenticada.

## Cambios compartidos propuestos, NO aplicados

Los archivos de propuestas son material para revisión; no son otra aplicación ni
se importan en producción. No se deben copiar o aplicar sin autorización.

| Archivo compartido                           | Cambio necesario                                                                                                            |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| package.json y lockfile elegido por el grupo | Añadir express y @types/express; instalar dependencias. mysql2 y tsx ya están declarados.                                   |
| src/BACKEND/app.ts                           | Crear una aplicación Express para el monolito y montar el router de lectura con IAM. Código en propuestas/app.ts.propuesto. |
| src/BACKEND/server.ts                        | Un único arranque compartido. propuestas/server.ts.propuesto recibe seguridad real y no arranca sin ella.                   |
| vite.config.ts                               | Proxy /api a http://127.0.0.1:3000, sin reescribir rutas ni desactivar seguridad. Propuesta en propuestas/vite-proxy.patch. |
| src/BACKEND/database/connectionDB.ts         | Sólo para la segunda etapa: pool, transacciones exclusivas y cierre. Código en propuestas/connectionDB.ts.propuesto.        |

Dependencias concretas a acordar: express ^5.1.0 y @types/express ^5.0.0, las mismas
declaradas en el manifest temporal del módulo. No hay dependencias nuevas para proxy,
transacciones o autenticación. La declaración global y su instalación requieren
autorización; no se ha instalado Express silenciosamente dentro del módulo.

La propuesta de app exige SeguridadAplicacion.autenticar y obtenerActor. La de
server exporta iniciarServidor(seguridad); no incluye una llamada ejecutable con
credenciales ficticias. Por eso todavía no corresponde prometer un comando dev:api
funcional. El arranque definitivo debe invocarlo después de integrar IAM.

Vue ya utiliza /api/recursos-camas con credentials: same-origin. Sus rutas de camas
e inventario están registradas una sola vez. No se necesita cambiar los servicios
HTTP ni añadir CORS si el proxy y la API se configuran en el origen acordado.
El proxy de Vite sólo sirve en desarrollo; producción necesita el mismo origen o
un reverse proxy compartido. No se ha modificado la configuración global.

## Segunda etapa: pool y escrituras

La propuesta conserva Database.getInstance(), query(sql, values), su tupla de
resultado y probarConexion(). La conexión única se reemplaza por un solo pool
propiedad del Singleton. Cada query aislada usa ese pool; withTransaction obtiene
una conexión exclusiva, ejecuta BEGIN, callback y COMMIT, y la libera en finally.
Ante fallo, hace ROLLBACK. Si también falla el rollback, descarta la conexión y
conserva ambos errores. Un commit incierto se propaga y no se reintenta solo.

crearProveedorTransacciones, en ContratosMysql.ts, adapta withTransaction al contrato
del módulo sin crear pools ni conexiones. Una vez aprobado y probado el proveedor:

```ts
const database = Database.getInstance()
const transacciones = crearProveedorTransacciones(database)
```

No usarlo con Database actual: todavía no tiene withTransaction. No ejecutar BEGIN
y COMMIT como queries sueltas sobre la conexión única. La propuesta también agrega
cerrar() para el apagado compartido y permite configurar credenciales por entorno.
Las credenciales reales y los archivos de entorno no deben versionarse.

Para habilitar HU 1.1/HU 2.1 faltan, además del pool, IAM, IPacienteGateway real de
Admisión y el montaje completo. Para HU 3.1 también faltan publicación/entrega
asíncronas y RegistroConsumosMysql durable en la misma transacción: el pool por sí
solo no garantiza deduplicación. No se propone ni ejecuta una migración en esta etapa.

## Verificaciones y límites

Resultado: **216 pruebas aprobadas y 25 HTTP omitidas** por falta de Express.
ESLint, TypeScript core y compilación de Vite sin emisión de archivos aprobados.
El chequeo completo del módulo ahora sólo informa Express y sus tipos ausentes;
mysql2 ya está instalado. La propuesta de pool y su compatibilidad con el adaptador
se comprobaron semánticamente con TypeScript en memoria, sin crear el archivo global.
El patch de proxy pasó git apply --check, sin aplicarse.

Las pruebas HTTP de sólo lectura comprueban GET autorizados, 401 sin identidad y
ausencia de POST, usando una conexión de prueba. No eliminan las verificaciones
para consultar la base real. El diagnóstico real no es una prueba HTTP.

Las pruebas del adaptador de transacciones sólo verifican delegación y propagación
de errores. El pool propuesto no se ha aplicado ni probado contra escrituras reales.
No se ejecutaron INSERT, UPDATE, DELETE, DDL ni transacciones de escritura en MySQL.
