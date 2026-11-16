# Historia Clínica integrada

Referencia recuperada selectivamente: `60eeef265ae10a37eceb84403613164cffba61ff`
(“Integrar main con historia clinica”). El contenido incluye entidades, contratos,
casos de uso y adaptadores; no se fusionó la rama completa. De los ajustes
posteriores se conservó la identificación del profesional mediante la sesión IAM
y el tratamiento seguro de errores. No se recuperó el alta de pacientes duplicada:
el adaptador de lectura reutiliza `MySQLPacienteRepository` de Admisión.

## Disponible

La vista `/historia-clinica` consulta pacientes existentes y muestra alergias,
antecedentes familiares, evoluciones y estudios desde MySQL. Permite registrar
alergias, antecedentes y evoluciones. No hay datos ficticios ni persistencia en
memoria. El diagnóstico se guarda en la columna real `diagnostico`, y la alergia
solicita su fecha de detección. Las fechas y los autores provienen de los registros.

Todas las rutas usan la sesión compartida y el middleware IAM. Política
conservadora local al módulo, revisable por el grupo: Médico, Enfermero y
Administrador consultan; **sólo Médico registra actos clínicos**. No se acepta
`id_medico` del cliente: siempre se toma `req.session.usuarioId`. Recepcionista,
Limpieza y usuarios sin sesión no acceden a la información clínica.

Prefijo: `/api/historia-clinica`.

| Método | Ruta | Operación |
| --- | --- | --- |
| GET | `/sesion` | Indica si el rol puede registrar |
| GET | `/pacientes` | Pacientes de Admisión |
| GET | `/pacientes/:id` | Paciente existente |
| GET | `/pacientes/dni/:dni` | Búsqueda por DNI |
| GET | `/paciente/:idPaciente` | Historia completa |
| GET | `/paciente/:idPaciente/estudios` | Estudios registrados |
| GET | `/alergias/paciente/:idPaciente` | Alergias |
| GET | `/antecedentes/paciente/:idPaciente` | Antecedentes familiares |
| GET | `/evoluciones/paciente/:idPaciente` | Evoluciones |
| POST | `/alergias` | Registra `id_paciente`, `sustancia`, `reaccion`, `gravedad`, `fecha_deteccion` (YYYY-MM-DD); estado inicial activa |
| POST | `/antecedentes` | Registra `id_paciente`, `parentesco`, `enfermedad`, `observaciones` opcionales |
| POST | `/evoluciones` | Registra `id_paciente`, `descripcion`, `diagnostico` |

Las consultas son parametrizadas. Inserción y recuperación del registro se
ejecutan sobre una misma conexión con `Database.withTransaction()`: un fallo
revierte la operación. Se validan IDs, valores enumerados, fechas y longitudes
antes de persistir; las claves foráneas validan paciente y profesional. No se
exponen errores SQL ni se registran datos clínicos en logs.

## Esquema y límites

Se verificaron mediante SELECT las tablas `pacientes`, `usuarios`, `alergias`,
`antecedentes_familiares`, `evoluciones_medicas` y `estudios_clinicos`, sus columnas
y claves foráneas. No se requieren migraciones ni cambios en la conexión.

- Estudios: sólo consulta, como en la versión de referencia; no había formulario
  de alta ni se añadió uno fuera del alcance.
- Corrección de alergias: la referencia sólo agregaba una copia en memoria.
  No se habilita esa simulación. El esquema no tiene vínculo al registro corregido,
  motivo ni una operación de rectificación auditable acordada. El grupo debe
  definirla antes de habilitar correcciones; no se sobrescriben registros originales.
- El esquema no contiene domicilio, número de afiliado ni número de historia
  clínica independiente. Se muestran datos existentes y el ID del paciente, sin
  inventar esos valores.
- Las escrituras se verifican con pruebas HTTP y conexión simulada. No se
  insertaron ni modificaron datos clínicos reales; queda una prueba manual con
  una sesión de Médico y datos autorizados por el grupo.

## Verificación

Resultado de esta integración: **502 pruebas aprobadas, 0 fallidas, 38 archivos**;
70 pruebas corresponden a Historia Clínica. TypeScript global y backend, ESLint
de archivos modificados y compilación Vite aprobaron. Las consultas reales de
los cuatro adaptadores clínicos funcionaron con el esquema local. Express inició
con MySQL; las rutas sin sesión devolvieron 401 y Socket.IO respondió 200. Los
rechazos 403 y las sesiones autorizadas se comprobaron en integración HTTP con
datos simulados. Durante el diagnóstico de arranque se bloquearon las escrituras
para que los procesadores existentes no generaran cargos ni descuentos reales.

```powershell
npm run type-check
npx tsc --noEmit --incremental false --composite false -p tsconfig.server.json
npx eslint src/BACKEND/modules/historia-clinica src/FRONTEND/modules/historia_clinica src/BACKEND/server.ts
npm run build-only
npx vitest run src --configLoader runner
git diff --check
```

Se usa `src` para excluir las copias de pruebas que TypeScript puede emitir en
`dist`. Las pruebas cubren validaciones, permisos con sesiones Express, contratos
HTTP, autor de sesión, parametrización, commit/rollback, errores y comportamiento
Vue (cookies, carga, selección, respuestas obsoletas y formularios).
