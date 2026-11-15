import type { RouteRecordRaw } from 'vue-router'

// Exportadas para que el router compartido las incorpore; no se registra ninguna ruta global aquí.
export const recursosCamasRoutes: RouteRecordRaw[] = [
  {
    path: 'recursos-camas',
    name: 'recursos-camas',
    component: () => import('../views/GestionCamasView.vue'),
  },
  {
    path: 'recursos-camas/inventario',
    name: 'recursos-camas-inventario',
    component: () => import('../views/InventarioView.vue'),
  },
]
