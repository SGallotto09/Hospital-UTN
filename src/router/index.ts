import { createRouter, createWebHistory } from "vue-router";
import LoginView from "../modules/IAM/views/LoginView.vue";

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: "/",
            redirect: "/login"
        },
        {
            path: "/login",
            name: "login",
            component: LoginView
        }
    ]
});

export default router;
