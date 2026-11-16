
<script setup lang="ts">
import { ref } from "vue";

const nombre = ref("");
const apellido = ref("");
const dni = ref("");
const email = ref("");
const usuario = ref("");
const contrasenia = ref("");
const rol = ref("Enfermero");

const mensaje = ref("");
const error = ref(false);
const registrando = ref(false);

async function registrarUsuario() {
    mensaje.value = "";
    error.value = false;

    if (registrando.value) return;

    registrando.value = true;

    try {
        const respuesta = await fetch("/api/auth/registro", {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                nombre: nombre.value,
                apellido: apellido.value,
                dni: dni.value,
                email: email.value,
                usuario: usuario.value,
                contrasenia: contrasenia.value,
                rol: rol.value
            })
        });

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            error.value = true;

            if (respuesta.status === 403) {
                mensaje.value = "No tenés permisos para registrar usuarios. Solo puede hacerlo un administrador.";
            } else if (respuesta.status === 401) {
                mensaje.value = "Debés iniciar sesión para realizar esta acción.";
            } else {
                mensaje.value = resultado.mensaje || "No se pudo registrar el usuario.";
            }

            return;
        }

        mensaje.value = "Usuario registrado correctamente.";

        nombre.value = "";
        apellido.value = "";
        dni.value = "";
        email.value = "";
        usuario.value = "";
        contrasenia.value = "";
        rol.value = "Enfermero";

    } catch {
        error.value = true;
        mensaje.value = "No se pudo conectar con el servidor.";
    } finally {
        registrando.value = false;
    }
}
</script>

<template>
    <div class="registro-container">
        <div class="encabezado">
            <div>
                <p class="subtitulo">ADMINISTRACIÓN DEL SISTEMA</p>
                <h1>Registrar usuario</h1>
                <p class="descripcion">
                    Completá los datos para dar de alta un nuevo usuario del hospital.
                </p>
            </div>
        </div>

        <form class="formulario" @submit.prevent="registrarUsuario">
            <div class="campos">
                <div class="campo">
                    <label>Nombre</label>
                    <input v-model="nombre" type="text" required />
                </div>

                <div class="campo">
                    <label>Apellido</label>
                    <input v-model="apellido" type="text" required />
                </div>

                <div class="campo">
                    <label>DNI</label>
                    <input v-model="dni" type="text" required />
                </div>

                <div class="campo">
                    <label>Email</label>
                    <input v-model="email" type="email" required />
                </div>

                <div class="campo">
                    <label>Nombre de usuario</label>
                    <input v-model="usuario" type="text" required />
                </div>

                <div class="campo">
                    <label>Contraseña</label>
                    <input v-model="contrasenia" type="password" required />
                </div>

                <div class="campo campo-rol">
                    <label>Rol del usuario</label>
                    <select v-model="rol" required>
                        <option value="Administrador">Administrador</option>
                        <option value="Médico">Médico</option>
                        <option value="Enfermero">Enfermero</option>
                        <option value="Recepcionista">Recepcionista</option>
                    </select>
                </div>
            </div>

            <p v-if="mensaje" :class="['mensaje', error ? 'mensaje-error' : 'mensaje-ok']">
                {{ mensaje }}
            </p>

            <div class="acciones">
                <button type="submit" :disabled="registrando">
                    {{ registrando ? "Registrando..." : "Registrar usuario" }}
                </button>
            </div>
        </form>
    </div>
</template>

<style scoped>
.registro-container {
    max-width: 950px;
    margin: 0 auto;
    padding: 35px;
}

.encabezado {
    margin-bottom: 30px;
}

.subtitulo {
    color: #2563eb;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 1.5px;
}

h1 {
    color: #172554;
    font-size: 30px;
    margin: 8px 0;
}

.descripcion {
    color: #64748b;
    font-size: 15px;
}

.formulario {
    background: white;
    padding: 30px;
    border-radius: 14px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 4px 15px rgba(15, 23, 42, 0.04);
}

.campos {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 22px;
}

.campo {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.campo label {
    color: #334155;
    font-size: 14px;
    font-weight: 600;
}

.campo input,
.campo select {
    padding: 12px 14px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    font-size: 14px;
    outline: none;
}

.campo input:focus,
.campo select:focus {
    border-color: #2563eb;
}

.campo-rol {
    grid-column: 1 / -1;
}

.acciones {
    display: flex;
    justify-content: flex-end;
    margin-top: 25px;
}

button {
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 13px 22px;
    font-weight: 600;
    cursor: pointer;
}

button:hover {
    background: #1d4ed8;
}

button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.mensaje {
    margin-top: 20px;
    font-size: 14px;
}

.mensaje-error {
    color: #dc2626;
}

.mensaje-ok {
    color: #15803d;
}

@media (max-width: 650px) {
    .registro-container {
        padding: 18px;
    }

    .campos {
        grid-template-columns: 1fr;
    }

    .campo-rol {
        grid-column: auto;
    }
}
</style>
