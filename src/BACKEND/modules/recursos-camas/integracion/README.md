# Integración compartida de Recursos y Camas

## Implementado

- Se utiliza únicamente src/BACKEND/server.ts, las sesiones IAM y verificarSesion.
- /api/auth/login, /logout y /registro conservan sus rutas. Registro sigue limitado a Administrador; IAM admite además Limpieza.
- /api/recursos-camas monta consultas, liberación operativa, limpieza y mantenimiento.
- POST /api/recursos-camas/asignaciones habilitado con crearPacienteGatewayAdmision(), que delega en MySQLPacienteRepository.buscarPorId(). Sin gateway, la fábrica sigue sin registrar la ruta.
- Database conserva Singleton, pool y query(). withTransaction() obtiene una conexión exclusiva, confirma o revierte y la libera. Si rollback falla, descarta esa conexión y propaga ambos errores. No hay reintentos automáticos de commits inciertos.
- Vite reenvía /api al backend http://127.0.0.1:3000, incluyendo cookies de sesión. No agrega CORS ni otra autenticación.
- El servidor valida configuración, espera MySQL antes de escuchar y devuelve errores HTTP sin exponer SQL al cliente. Cierra HTTP y pool ante SIGINT/SIGTERM.

## Permisos aprobados

La política vive en infraestructure/api/obtenerActorSesion.ts y se inyecta explícitamente desde server.ts. La fábrica sin política sigue denegando permisos. La identidad sólo procede de req.session.

| Rol | Permisos |
| --- | --- |
| Administrador | camas:consultar, camas:asignar, camas:liberar, camas:limpiar, camas:mantener, inventario:consultar |
| Recepcionista | camas:consultar, camas:asignar, camas:liberar |
| Médico | camas:consultar |
| Enfermero | camas:consultar, inventario:consultar |
| Limpieza | camas:consultar, camas:limpiar |

Los permisos no habilitan rutas ausentes. Mantenimiento queda reservado a Administrador.

## Ejecución local

Configurar SESSION_SECRET, DB_HOST, DB_USER, DB_PASSWORD y DB_NAME en el entorno o .env local, sin subir secretos. DB_PASSWORD debe estar definida; se acepta vacía si corresponde a la configuración local real. PORT es opcional y vale 3000 por defecto. Si se cambia, ajustar también el destino del proxy de desarrollo.

Desde la raíz ejecutar npm run backend y npm run dev en terminales distintas. Iniciar sesión mediante la API IAM real; su vista de login todavía es visual y corresponde integrar a IAM. No se agregaron usuarios ni endpoints de autenticación de prueba al servidor.

Las cookies actuales son para desarrollo HTTP local. Para producción quedan por acordar HTTPS y almacenamiento persistente de sesiones; se conserva la configuración existente de express-session.

## Pendientes y límites

- Base local inspeccionada: MariaDB 10.11.16, InnoDB, cero pacientes con asignaciones activas duplicadas. Tras respaldo se aplicó exclusivamente el ALTER autorizado: id_paciente_activo INT generado según fecha_egreso IS NULL e índice único uq_paciente_activo. No se insertaron ni modificaron asignaciones de prueba.
- Respaldo local fuera de Git: backups.local/asignaciones_camas-2026-11-16T13-11-11-560Z.sql (estructura completa; 0 filas). SHA-256: 20d2f7b1ab4504eafb5c8297d4a8fc2d22c2e276426ebf8458075c382c2587b9. Se verificó el archivo por lectura; no se ensayó su restauración.
- El dump disponible define usuarios.rol VARCHAR(45): Limpieza no requiere DDL con ese esquema. Verificar la estructura activa cuando haya credenciales. El dump también define contrasenia VARCHAR(45), insuficiente para bcrypt: confirmar y acordar su ampliación con el grupo antes de modificar SQL.
- Admisión: integración implementada sin modificar su módulo ni duplicar SQL. Antes de habilitar esta versión en otro entorno, aplicar con autorización la misma restricción uq_paciente_activo. La aplicación traduce su violación a PACIENTE_YA_ASIGNADO (409).
- Alta/traslado clínicos: la liberación operativa existente cierra la asignación y deja la cama En limpieza; no registra un alta clínica ni el destino de un traslado.
- Enfermería: backend de medicación incorporado selectivamente; administración y pendiente en una transacción, consumidor persistente y procesador secuencial conectados. Tabla consumos_medicacion verificada, sin cambios SQL. Revisión y validación real de concurrencia pendientes. El frontend de medicación actual todavía es visual y no se modificó.
- El esquema no permite auditar actor/motivo/fechas de limpieza o mantenimiento; no se simula ese historial.
- Otros módulos: entregar su Router y acordar la ruta base; se agregará un app.use explícito al servidor, sin rutas ficticias.

Los archivos de propuestas/ son referencias históricas anteriores a esta integración; no se deben aplicar sobre la implementación actual.

## Verificación

Suite del módulo actual: 366 pruebas aprobadas, sin omisiones, en 20 archivos. TypeScript del módulo y global, ESLint del módulo/servidor y Vite aprobados. Incluyen gateway de Admisión, composición con y sin pacientes, permisos, conflicto HTTP 409 y rollback para ambos índices únicos. Las sesiones y conexiones de prueba no representan usuarios ni persistencia reales. Queda pendiente comprobar el flujo de medicación y la concurrencia contra MySQL real; no se ejecutaron administraciones ni descuentos de prueba. Se probaron rollback de ambas inserciones, bloqueo de dosis, stock, registro persistente, revisión, reintentos, reinicio y cierre del procesador mediante dobles.

Comandos: npm run test --prefix src/BACKEND/modules/recursos-camas; npm run type-check --prefix src/BACKEND/modules/recursos-camas; npm run type-check; npm run build-only. ESLint se ejecuta sin --fix para no modificar módulos ajenos.
