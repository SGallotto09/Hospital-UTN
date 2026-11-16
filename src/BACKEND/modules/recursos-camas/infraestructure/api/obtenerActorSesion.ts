import type { ObtenerActor } from '../../presentation/controlers/CamasController.js'

export interface PermisosPorRol {
  [rol: string]: readonly string[] | undefined
}

// Nombres exactos admitidos por IAM/RegistrarUsuario.ts. No son roles nuevos.
const rolesIAM = ['Administrador', 'Médico', 'Enfermero', 'Recepcionista', 'Limpieza']

export const permisosRecursosCamasPorRol: PermisosPorRol = {
  Administrador: ['camas:consultar', 'camas:asignar', 'camas:liberar', 'camas:limpiar', 'camas:mantener', 'inventario:consultar'],
  Recepcionista: ['camas:consultar', 'camas:asignar', 'camas:liberar'],
  Médico: ['camas:consultar'],
  Enfermero: ['camas:consultar', 'inventario:consultar'],
  Limpieza: ['camas:consultar', 'camas:limpiar'],
}

// Sin una correspondencia aprobada no se concede ningún permiso.
export function crearObtenerActorDesdeSesion(permisosPorRol: PermisosPorRol = {}): ObtenerActor {
  return (req) => {
    const sesion = req.session
    if (
      !sesion ||
      !Number.isSafeInteger(sesion.usuarioId) ||
      typeof sesion.usuarioId !== 'number' ||
      sesion.usuarioId <= 0 ||
      sesion.usuarioId > 2147483647 ||
      typeof sesion.rol !== 'string' ||
      !sesion.rol
    ) {
      return undefined
    }
    const permisos =
      rolesIAM.includes(sesion.rol) && Object.hasOwn(permisosPorRol, sesion.rol)
        ? (permisosPorRol[sesion.rol] ?? [])
        : []
    return { idUsuario: sesion.usuarioId, permisos: [...permisos] }
  }
}
