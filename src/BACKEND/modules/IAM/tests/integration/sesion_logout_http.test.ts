import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import session from 'express-session';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { AuthController } from '../../infraestructure/api/AuthController.js';
import { AuthRoutes } from '../../infraestructure/api/AuthRoutes.js';
import { IniciarSesion } from '../../use-cases/IniciarSesion.js';
import { Usuario } from '../../domain/entities/Usuario.js';
import { BcryptHasheadorContrasenia } from '../../infraestructure/repositories/BcryptHasheadorContrasenia.js';
import { BcryptVerificadorContrasenia } from '../../infraestructure/repositories/BcryptVerificadorContrasenia.js';
import { verificarSesion } from '../../infraestructure/middlewares/verificarSesion.js';
import { verificarRol } from '../../infraestructure/middlewares/verificarRol.js';

describe('IAM HTTP real: login bcrypt, consulta y destrucción de sesión', () => {
    let server: Server;
    let url: string;
    let hash: string;
    let rol: string;
    const store = new session.MemoryStore();
    // Credencial ficticia exclusiva de pruebas; nunca se consulta MySQL.
    const clavePrueba = 'clave-exclusiva-de-prueba';
    async function login() {
        const respuesta = await fetch(url + '/api/auth/login', { method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario: 'usuario_prueba', contrasenia: clavePrueba }) });
        expect(respuesta.status).toBe(200); await respuesta.text();
        return respuesta.headers.get('set-cookie')!.split(';')[0]!;
    }
    beforeAll(async () => {
        hash = await new BcryptHasheadorContrasenia().hashear(clavePrueba);
        const repositorio = {
            buscarPorUsuario: vi.fn(async (nombre: string) => nombre === 'usuario_prueba'
                ? new Usuario(7, 'Prueba', 'Local', '90000002', 'test@example.test', nombre, hash, rol) : null),
            buscarPorId: vi.fn(), guardar: vi.fn(),
        };
        const controller = new AuthController(new IniciarSesion(repositorio, new BcryptVerificadorContrasenia()));
        const app = express(); app.use(express.json());
        app.use(session({ secret: 'secreto-exclusivo-de-pruebas', resave: false,
            saveUninitialized: false, store, cookie: { httpOnly: true, sameSite: 'lax', maxAge: 60000 } }));
        app.use('/api/auth', new AuthRoutes(controller).obtenerRouter());
        app.get('/privada', verificarSesion, verificarRol(['Administrador']), (_req, res) => { res.json({ autorizado: true }); });
        server = createServer(app);
        await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
        url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    });
    beforeEach(async () => {
        rol = 'Administrador';
        await new Promise<void>((resolve, reject) => store.clear(error => error ? reject(error) : resolve()));
    });
    afterAll(async () => {
        await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    });
    it('sin sesión responde 401 y no permite cachear la respuesta', async () => {
        const respuesta = await fetch(url + '/api/auth/sesion');
        expect(respuesta.status).toBe(401);
        expect(respuesta.headers.get('cache-control')).toBe('no-store');
    });
    it('devuelve sólo identidad y rol de la sesión real, con su vencimiento', async () => {
        const cookie = await login();
        const respuesta = await fetch(url + '/api/auth/sesion', { headers: { cookie } });
        expect(respuesta.status).toBe(200);
        const datos = await respuesta.json();
        expect(datos.usuario).toEqual({ id: 7, rol: 'Administrador' });
        expect(Date.parse(datos.expira)).toBeGreaterThan(Date.now());
        expect(JSON.stringify(datos)).not.toContain(hash);
    });
    it('logout destruye la sesión, borra la cookie y rechaza reutilizarla', async () => {
        const cookie = await login();
        const salida = await fetch(url + '/api/auth/logout', { method: 'POST', headers: { cookie } });
        expect(salida.status).toBe(200); await salida.text();
        expect(salida.headers.get('set-cookie')).toContain('connect.sid=;');
        expect((await fetch(url + '/api/auth/sesion', { headers: { cookie } })).status).toBe(401);
        expect((await fetch(url + '/privada', { headers: { cookie } })).status).toBe(401);
    });
    it('una sesión eliminada o vencida no conserva acceso aunque se reenvíe la cookie', async () => {
        const cookie = await login();
        await new Promise<void>(resolve => store.clear(() => resolve()));
        expect((await fetch(url + '/api/auth/sesion', { headers: { cookie } })).status).toBe(401);
    });
    it('un error al destruir responde 500 y conserva una sesión que no pudo invalidar', async () => {
        const cookie = await login();
        vi.spyOn(store, 'destroy').mockImplementationOnce((_id, callback) => callback?.(new Error('Fallo del store')));
        const salida = await fetch(url + '/api/auth/logout', { method: 'POST', headers: { cookie } });
        expect(salida.status).toBe(500);
        expect(salida.headers.get('set-cookie')).toBeNull();
        expect((await fetch(url + '/api/auth/sesion', { headers: { cookie } })).status).toBe(200);
    });
    it('mantiene 401 sin sesión y 403 con rol insuficiente', async () => {
        expect((await fetch(url + '/privada')).status).toBe(401);
        rol = 'Enfermero'; const cookie = await login();
        expect((await fetch(url + '/privada', { headers: { cookie } })).status).toBe(403);
    });
});
