
import { createRouter, createWebHistory } from "vue-router";

import LoginView from "../FRONTEND/modules/IAM/views/LoginView.vue";
import MainLayout from "../FRONTEND/layouts/MainLayout.vue";
import AtenciónEnfermeriaView from "../FRONTEND/modules/atencion-enfermeria/views/AtenciónEnfermeriaView.vue";

import AdmissionLayout from "../FRONTEND/layouts/AdmissionLayout.vue";
import DashboardView from "@/FRONTEND/modules/admicion-turnos/views/DashboardView.vue";

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
                    path: "admisiones",
                    component: AdmissionLayout,
                    redirect: { name: "dashboard-turnos" },
                    children: [
                        {
                            path: "dashboard",
                            name: "dashboard-turnos",
                            component: DashboardView
                        },
                        {
                            path: "pacientes",
                            name: "pacientes-turnos",
                            component: () =>
                                import("@/FRONTEND/modules/admicion-turnos/views/PacientesView.vue")
                        },
                        {
                            path: "agenda",
                            name: "agenda-medica",
                            component: () =>
                                import("@/FRONTEND/modules/admicion-turnos/views/AgendaView.vue")
                        },
                        {
                            path: "turnos",
                            name: "gestion-turnos",
                            component: () =>
                                import("@/FRONTEND/modules/admicion-turnos/views/TurnosView.vue")
                        },
                        {
                            path: "lista-espera",
                            name: "lista-espera",
                            component: () =>
                                import("@/FRONTEND/modules/admicion-turnos/views/ListaEsperaView.vue")
                        },
                        {
                            path: "triaje",
                            name: "triaje",
                            component: () =>
                                import("@/FRONTEND/modules/admicion-turnos/views/TriajeView.vue")
                        }
                    ]
                }
            ]
        }
    ]
});

export default router;
