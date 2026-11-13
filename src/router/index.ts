
import { createRouter, createWebHistory } from "vue-router";

import LoginView from "../BACKEND/modules/IAM/views/LoginView.vue";
import MainLayout from "../layouts/MainLayout.vue";

import AtenciónEnfermeriaView from "@/modules/atencion-enfermeria/views/AtenciónEnfermeriaView.vue";

const router = createRouter({
    history: createWebHistory(),

    routes: [
        // LOGIN
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

                // ATENCIÓN Y ENFERMERÍA
                {
                    path: "enfermeria",
                    name: "enfermeria",
                    component: AtenciónEnfermeriaView
                },

                {
                    path: "enfermeria/pacientes",
                    name: "enfermeria-pacientes",
                    component: () =>
                        import("@/modules/atencion-enfermeria/views/PacientesInternadosView.vue")
                },
                {
                    path: "/historia-clinica",
                    name: "historia-clinica",
                    component: () => import("../modules/historia-clinica/views/historia-clinica-view.vue")
                },

                {
                    path: "enfermeria/signos-vitales",
                    name: "enfermeria-signos-vitales",
                    component: () =>
                        import("@/modules/atencion-enfermeria/views/SignosVitalesView.vue")
                },

                {
                    path: "enfermeria/medicacion",
                    name: "enfermeria-medicacion",
                    component: () =>
                        import("@/modules/atencion-enfermeria/views/MedicacionView.vue")
                },

                {
                    path: "enfermeria/alertas",
                    name: "enfermeria-alertas",
                    component: () =>
                        import("@/modules/atencion-enfermeria/views/AlertasView.vue")
                }
            ]
        }
    ]
});

export default router;
