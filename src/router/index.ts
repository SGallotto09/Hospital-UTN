
import { createRouter, createWebHistory } from "vue-router";

import LoginView from "../FRONTEND/modules/IAM/views/LoginView.vue";
import MainLayout from "../FRONTEND/layouts/MainLayout.vue";

import AtenciónEnfermeriaView from "../FRONTEND/modules/atencion-enfermeria/views/AtenciónEnfermeriaView.vue";

const router = createRouter({
    history: createWebHistory(),

    routes: [
        {
            path: "/login",
            name: "login",
            component: LoginView
        },

        {
            path: "/",
            component: MainLayout,

            children: [
                {
                    path: "",
                    redirect: "/login"
                },

                {
                    path: "enfermeria",
                    name: "enfermeria",
                    component: AtenciónEnfermeriaView
                },

                {
                    path: "enfermeria/pacientes",
                    name: "enfermeria-pacientes",
                    component: () =>
                        import("@/FRONTEND/modules/atencion-enfermeria/views/PacientesInternadosView.vue")
                },

                {
                    path: "/historia_clinica",
                    name: "historia_clinica",
                    component: () =>
                        import("../FRONTEND/modules/historia_clinica/views/historia_clinica_view.vue")
                },

                {
                    path: "enfermeria/signos-vitales",
                    name: "enfermeria-signos-vitales",
                    component: () =>
                        import("@/FRONTEND/modules/atencion-enfermeria/views/SignosVitalesView.vue")
                },

                {
                    path: "enfermeria/medicacion",
                    name: "enfermeria-medicacion",
                    component: () =>
                        import("@/FRONTEND/modules/atencion-enfermeria/views/MedicacionView.vue")
                },

                {
                    path: "enfermeria/alertas",
                    name: "enfermeria-alertas",
                    component: () =>
                        import("@/FRONTEND/modules/atencion-enfermeria/views/AlertasView.vue")
                },

                {
                    path: "recursos-camas",
                    name: "recursos-camas",
                    component: () =>
                        import("@/FRONTEND/modules/recursos-camas/views/GestionCamasView.vue")
                },
                {
                    path: "recursos-camas/inventario",
                    name: "recursos-camas-inventario",
                    component: () =>
                        import("@/FRONTEND/modules/recursos-camas/views/InventarioView.vue")
                }
            ]
        }
    ]
});

export default router;
