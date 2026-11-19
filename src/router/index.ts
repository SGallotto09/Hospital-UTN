import { createRouter, createWebHistory } from "vue-router";
import { protegerRutas } from "./autenticacion";

import LoginView from "../FRONTEND/modules/IAM/views/LoginView.vue";
import MainLayout from "../FRONTEND/layouts/MainLayout.vue";

import AtenciónEnfermeriaView from "../FRONTEND/modules/atencion-enfermeria/views/AtenciónEnfermeriaView.vue";

import AdmissionLayout from "../FRONTEND/layouts/AdmissionLayout.vue";
import DashboardView from "@/FRONTEND/modules/admicion-turnos/views/DashboardView.vue";
import RegistroUsuariosView from "../FRONTEND/modules/IAM/RegistroUsuariosView.vue";

// FACTURACIÓN Y ADMINISTRACIÓN
import FacturacionView from "../FRONTEND/modules/facturacion-administracion/views/FacturacionView.vue";

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
                    meta: { roles: ["Administrador", "Enfermero"] },
                    component: AtenciónEnfermeriaView
                },
                {
                    path: "enfermeria/pacientes",
                    name: "enfermeria-pacientes",
                    meta: { roles: ["Administrador", "Médico", "Enfermero"] },
                    component: () =>
                        import("@/FRONTEND/modules/atencion-enfermeria/views/PacientesInternadosView.vue")
                },
                {
                    path: "enfermeria/signos-vitales",
                    name: "enfermeria-signos-vitales",
                    meta: { roles: ["Enfermero"] },
                    component: () =>
                        import("@/FRONTEND/modules/atencion-enfermeria/views/SignosVitalesView.vue")
                },
                {
                    path: "enfermeria/medicacion",
                    name: "enfermeria-medicacion",
                    meta: { roles: ["Médico", "Enfermero"] },
                    component: () =>
                        import("@/FRONTEND/modules/atencion-enfermeria/views/MedicacionView.vue")
                },

                {
                    path: "historia-clinica",
                    alias: "/historia_clinica",
                    meta: {
                        roles: ["Médico", "Enfermero", "Administrador"]
                    },
                    name: "historia_clinica",
                    component: () =>
                        import("../FRONTEND/modules/historia_clinica/views/historia_clinica_view.vue")
                },

                // ADMINISTRACIÓN DE USUARIOS
                {
                    path: "usuarios/registro",
                    name: "registro-usuarios",
                    meta: { roles: ["Administrador"] },
                    component: RegistroUsuariosView
                },

                // FACTURACIÓN Y ADMINISTRACIÓN
                {
                    path: "facturacion",
                    name: "facturacion",
                    meta: { roles: ["Administrador"] },
                    component: FacturacionView
                },

                // ADMISIÓN Y TURNOS
                {
                    path: "enfermeria/protocolos",
                    name: "enfermeria-protocolos",
                    meta: { roles: ["Administrador", "Enfermero"] },
                    component: () =>
                        import("@/FRONTEND/modules/atencion-enfermeria/views/ProtocolosView.vue")
                },
                {
                    path: "recursos-camas",
                    name: "recursos-camas",
                    meta: {
                        roles: [
                            "Administrador",
                            "Médico",
                            "Enfermero",
                            "Recepcionista",
                            "Limpieza"
                        ]
                    },
                    component: () =>
                        import("@/FRONTEND/modules/recursos-camas/views/GestionCamasView.vue")
                },
                {
                    path: "recursos-camas/inventario",
                    name: "recursos-camas-inventario",
                    meta: { roles: ["Administrador", "Enfermero"] },
                    component: () =>
                        import("@/FRONTEND/modules/recursos-camas/views/InventarioView.vue")
                },

                {
                    path: "admisiones",
                    component: AdmissionLayout,
                    redirect: { name: "dashboard-turnos" },

                    children: [
                        {
                            path: "dashboard",
                            name: "dashboard-turnos",
                            meta: {
                                roles: ["Administrador", "Recepcionista"]
                            },
                            component: DashboardView
                        },
                        {
                            path: "pacientes",
                            name: "pacientes-turnos",
                            meta: {
                                roles: ["Administrador", "Recepcionista"]
                            },
                            component: () =>
                                import("@/FRONTEND/modules/admicion-turnos/views/PacientesView.vue")
                        },
                        {
                            path: "agenda",
                            name: "agenda-medica",
                            meta: {
                                roles: ["Administrador", "Recepcionista", "Médico"]
                            },
                            component: () =>
                                import("@/FRONTEND/modules/admicion-turnos/views/AgendaView.vue")
                        },
                        {
                            path: "turnos",
                            name: "gestion-turnos",
                            meta: {
                                roles: ["Administrador", "Recepcionista"]
                            },
                            component: () =>
                                import("@/FRONTEND/modules/admicion-turnos/views/TurnosView.vue")
                        },
                        {
                            path: "lista-espera",
                            name: "lista-espera",
                            meta: {
                                roles: ["Administrador", "Recepcionista"]
                            },
                            component: () =>
                                import("@/FRONTEND/modules/admicion-turnos/views/ListaEsperaView.vue")
                        },
                        {
                            path: "triaje",
                            name: "triaje",
                            meta: {
                                roles: ["Administrador", "Enfermero"]
                            },
                            component: () =>
                                import("@/FRONTEND/modules/admicion-turnos/views/TriajeView.vue")
                        }
                    ]
                }
            ]
        },
        { path: "/:pathMatch(.*)*", redirect: "/login" }
    ]
});

protegerRutas(router);

export default router;
