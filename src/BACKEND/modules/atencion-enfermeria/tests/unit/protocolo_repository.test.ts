import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProtocoloAtencionRepositoryMysql } from '../../infraestructure/repositories/protocolo_atencion_repository_mysql.js';
import { PreOpProtocolBuilder } from '../../domain/builders/pre_op_protocol_builder.js';

const mocks = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock('mysql2/promise', () => ({ default: { createPool: () => ({ execute: mocks.execute }) } }));

function responder(...filas: unknown[]) {
    for (const fila of filas) {
        if (fila instanceof Error) mocks.execute.mockRejectedValueOnce(fila);
        else mocks.execute.mockResolvedValueOnce([fila, []]);
    }
}

beforeEach(() => vi.resetAllMocks());
afterEach(() => vi.restoreAllMocks());

describe('guardado compensado de protocolos', () => {
    it('guarda el protocolo y sus tareas', async () => {
        responder([{ id: 9 }], { insertId: 40 }, { insertId: 1 }, { insertId: 2 }, { insertId: 3 });
        const protocolo = new PreOpProtocolBuilder();
        protocolo.reiniciar(12);
        await expect(new ProtocoloAtencionRepositoryMysql().guardar(protocolo.obtener_protocolo())).resolves.toBe(40);
        expect(mocks.execute).toHaveBeenCalledTimes(5);
        expect(mocks.execute.mock.calls.slice(2).every(([sql]) => String(sql).includes('INSERT INTO tareas_enfermeria'))).toBe(true);
    });

    it('elimina únicamente las tareas y el protocolo creados en la operación si falla una tarea', async () => {
        const fallo = new Error('falló inserción de tarea');
        const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        responder([{ id: 9 }], { insertId: 40 }, { insertId: 1 }, fallo, { affectedRows: 1 }, { affectedRows: 1 });
        const protocolo = new PreOpProtocolBuilder();
        protocolo.reiniciar(12);
        await expect(new ProtocoloAtencionRepositoryMysql().guardar(protocolo.obtener_protocolo())).rejects.toBe(fallo);
        expect(mocks.execute.mock.calls[4]?.[0]).toContain('DELETE FROM tareas_enfermeria WHERE id_protocolo = ?');
        expect(mocks.execute.mock.calls[4]?.[1]).toEqual([40]);
        expect(mocks.execute.mock.calls[5]?.[0]).toContain('DELETE FROM protocolos_atencion WHERE id = ?');
        expect(mocks.execute.mock.calls[5]?.[1]).toEqual([40]);
        log.mockRestore();
    });

    it('continúa con ambas limpiezas e informa los dos errores si falla la compensación', async () => {
        const fallo_tarea = new Error('falló tarea');
        const fallo_limpieza = new Error('falló limpieza');
        const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        responder([{ id: 9 }], { insertId: 41 }, fallo_tarea, fallo_limpieza, fallo_limpieza);
        const protocolo = new PreOpProtocolBuilder();
        protocolo.reiniciar(12);
        await expect(new ProtocoloAtencionRepositoryMysql().guardar(protocolo.obtener_protocolo())).rejects.toBe(fallo_tarea);
        expect(mocks.execute).toHaveBeenCalledTimes(5);
        expect(log).toHaveBeenCalledTimes(3);
        log.mockRestore();
    });

    it('no crea un protocolo para un paciente sin internación activa', async () => {
        responder([]);
        const protocolo = new PreOpProtocolBuilder();
        protocolo.reiniciar(12);

        await expect(new ProtocoloAtencionRepositoryMysql().guardar(protocolo.obtener_protocolo()))
            .rejects.toMatchObject({ estado_http: 404 });
        expect(mocks.execute).toHaveBeenCalledOnce();
    });

    it('no crea un protocolo si el paciente tiene internaciones activas ambiguas', async () => {
        responder([{ id: 9 }, { id: 10 }]);
        const protocolo = new PreOpProtocolBuilder();
        protocolo.reiniciar(12);

        await expect(new ProtocoloAtencionRepositoryMysql().guardar(protocolo.obtener_protocolo()))
            .rejects.toMatchObject({ estado_http: 409 });
        expect(mocks.execute).toHaveBeenCalledOnce();
    });

    it('acepta repetir el estado actual de una tarea existente', async () => {
        responder({ affectedRows: 0 }, [{ id: 5 }]);

        await expect(new ProtocoloAtencionRepositoryMysql().actualizarEstadoTarea(5, 'Completada'))
            .resolves.toBeUndefined();
        expect(mocks.execute).toHaveBeenCalledTimes(2);
        expect(mocks.execute.mock.calls[1]?.[0]).toContain('SELECT id FROM tareas_enfermeria');
    });

    it('devuelve 404 si no existe la tarea al repetir su estado', async () => {
        responder({ affectedRows: 0 }, []);

        await expect(new ProtocoloAtencionRepositoryMysql().actualizarEstadoTarea(99, 'Completada'))
            .rejects.toMatchObject({ estado_http: 404 });
    });
});
