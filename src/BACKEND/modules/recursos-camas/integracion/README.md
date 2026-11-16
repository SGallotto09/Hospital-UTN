# Integración compartida de Recursos y Camas

## Implementado

- Se utiliza únicamente src/BACKEND/server.ts, las sesiones IAM y verificarSesion.
- /api/auth/login, /logout y /registro conservan sus rutas. Registro sigue limitado a Administrador; IAM admite además Limpieza.
- /api/recursos-camas monta consultas, liberación operativa, limpieza y mantenimiento.
- POST /api/recursos-camas/asignaciones NO se registra sin IPacienteGateway de Admisión.
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

- En esta ejecución no están presentes las variables requeridas; no se inició una conexión real ni se ejecutaron escrituras, migraciones o cambios de esquema.
- El dump disponible define usuarios.rol VARCHAR(45): Limpieza no requiere DDL con ese esquema. Verificar la estructura activa cuando haya credenciales. El dump también define contrasenia VARCHAR(45), insuficiente para bcrypt: confirmar y acordar su ampliación con el grupo antes de modificar SQL.
- Admisión: proporcionar IPacienteGateway real para habilitar asignación.
- Alta/traslado clínicos: la liberación operativa existente cierra la asignación y deja la cama En limpieza; no registra un alta clínica ni el destino de un traslado.
- Enfermería: productor y entrega asíncrona reales, RegistroConsumosMysql durable y canal de resultados. Sin deduplicación persistente el consumidor no descuenta stock.
- El esquema no permite auditar actor/motivo/fechas de limpieza o mantenimiento; no se simula ese historial.
- Otros módulos: entregar su Router y acordar la ruta base; se agregará un app.use explícito al servidor, sin rutas ficticias.

Los archivos de propuestas/ son referencias históricas anteriores a esta integración; no se deben aplicar sobre la implementación actual.

## Verificación

Suite del módulo: 305 pruebas aprobadas, sin omisiones, en 17 archivos. Suite desde la raíz: 550 pruebas aprobadas en 30 archivos. Incluyen backend, frontend, sesiones reales, registro protegido y composición sin Admisión. Las sesiones y conexiones de prueba no representan usuarios ni persistencia reales. Las pruebas del pool verifican commit, rollback, liberación, errores y adquisición independiente mediante dobles; queda pendiente acreditar concurrencia sobre MySQL real.

Comandos: npm run test --prefix src/BACKEND/modules/recursos-camas; npm run type-check --prefix src/BACKEND/modules/recursos-camas; npm run type-check; npm run build-only. ESLint se ejecuta sin --fix para no modificar módulos ajenos.
