import { computed } from 'vue'
import { rolActual } from '../../../../router/autenticacion'

// Adaptación visual del rol verificado por IAM. El backend sigue autorizando cada petición.
export const permisosCamas = computed(() => {
  const administrador = rolActual.value === 'Administrador'
  return {
    crear: administrador,
    asignar: administrador || rolActual.value === 'Recepcionista',
    liberar: administrador || rolActual.value === 'Recepcionista',
    limpiar: administrador || rolActual.value === 'Limpieza',
    mantener: administrador,
    inventario: administrador || rolActual.value === 'Enfermero',
  }
})
