import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdministracionMedicacionRepositoryMysq } from '../../infraestructure/repositories/administracion_medicacion_repository_mysql.js';

const mocks = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock('mysql2/promise', () => ({ default: { createPool: () => ({ execute: mocks.execute }) } }));

const horario = new Date('2026-11-16T10:00:00');
function responder(...filas: unknown[]) {
    for (const fila of filas) {
        if (fila instanceof Error) mocks.execute.mockRejectedValueOnce(fila);
        else mocks.execute.mockResolvedValueOnce([fila, []]);
    }
}

beforeEach(() => vi.resetAllMocks());
afterEach(() => vi.restoreAllMocks());

describe('persistencia de administración de medicación', () => {
    it('crea una indicación usando el médico de sesión y valida paciente e insumo', async () => {
        responder([{ id: 30 }], [{ id: 4 }], { insertId: 41 });
        const id = await new AdministracionMedicacionRepositoryMysq().crearIndicacion({
            id_medico: 9, id_paciente: 30, id_insumo: 4, cantidad: 2,
            fecha: '2026-12-01', hora_inicio: '08:00', frecuencia_horas: 6,
        });
        expect(id).toBe(41);
        expect(mocks.execute.mock.calls[2]?.[0]).toContain('INSERT INTO indicacion_medica');
        expect(mocks.execute.mock.calls[2]?.[1]).toEqual([9, 30, 4, 2, '2026-12-01', '08:00', 6]);
    });

    it('rechaza paciente sin internación activa e insumo inexistente', async () => {
        const repo = new AdministracionMedicacionRepositoryMysq();
        responder([]);
        await expect(repo.crearIndicacion({ id_medico: 9, id_paciente: 30, id_insumo: 4, cantidad: 2, fecha: '2026-12-01', hora_inicio: '08:00', frecuencia_horas: 6 }))
            .rejects.toMatchObject({ estado_http: 404 });
        responder([{ id: 30 }], []);
        await expect(repo.crearIndicacion({ id_medico: 9, id_paciente: 30, id_insumo: 4, cantidad: 2, fecha: '2026-12-01', hora_inicio: '08:00', frecuencia_horas: 6 }))
            .rejects.toMatchObject({ estado_http: 404 });
    });

    it('consulta historial con paciente, insumo, enfermero y fecha de administración', async () => {
        const fila = { id: 2, nombre: 'Ana', apellido: 'Prueba', medicamento: 'Insumo', cantidad: 1, fecha_hora: horario, enfermero: 'Eva Enfermera' };
        responder([fila]);
        await expect(new AdministracionMedicacionRepositoryMysq().obtenerHistorial()).resolves.toEqual([fila]);
        expect(mocks.execute.mock.calls[0]?.[0]).toContain('LEFT JOIN usuarios u ON u.id = am.id_enfermero');
    });

    it('registra el consumo pendiente sin descontar stock; Recursos-Camas procesa el descuento', async () => {
        responder([], [{ id_insumo: 4, cantidad: 1, id_paciente: 8 }], [{ piso: 2 }], [{ stock: 5 }], { insertId: 25 }, { affectedRows: 1 });
        const id = await new AdministracionMedicacionRepositoryMysq().administrar(1, 7, horario, horario, 1);

        expect(id).toBe(25);
        const llamadas = mocks.execute.mock.calls;
        expect(llamadas[4]?.[0]).toContain('INSERT INTO administracion_medicacion');
        expect(llamadas[5]?.[0]).toContain("VALUES (?, ?, ?, ?, 'pendiente')");
        expect(llamadas[5]?.[1]).toEqual([25, 4, 1, 2]);
        expect(llamadas.some(([sql]) => /UPDATE\s+insumos/i.test(String(sql)))).toBe(false);
    });

    it('rechaza stock insuficiente antes de guardar la administración', async () => {
        responder([], [{ id_insumo: 4, cantidad: 1, id_paciente: 8 }], [{ piso: 2 }], [{ stock: 0 }]);
        await expect(new AdministracionMedicacionRepositoryMysq().administrar(1, 7, horario, horario, 1))
            .rejects.toMatchObject({ estado_http: 409 });
        expect(mocks.execute).toHaveBeenCalledTimes(4);
    });

    it('propaga el fallo al guardar la administración sin crear consumo', async () => {
        const fallo = new Error('falló insert en administración');
        responder([], [{ id_insumo: 4, cantidad: 1, id_paciente: 8 }], [{ piso: 2 }], [{ stock: 5 }], fallo);
        await expect(new AdministracionMedicacionRepositoryMysq().administrar(1, 7, horario, horario, 1))
            .rejects.toBe(fallo);
        expect(mocks.execute).toHaveBeenCalledTimes(5);
    });

    it('conserva la administración si el consumo no aparece tras el error de INSERT', async () => {
        const fallo = new Error('falló insert en consumos');
        const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        responder([], [{ id_insumo: 4, cantidad: 1, id_paciente: 8 }], [{ piso: 2 }], [{ stock: 5 }], { insertId: 25 }, fallo, []);

        await expect(new AdministracionMedicacionRepositoryMysq().administrar(1, 7, horario, horario, 1))
            .rejects.toBe(fallo);
        expect(mocks.execute.mock.calls[6]?.[0]).toContain('SELECT id_insumo, cantidad, piso');
        expect(mocks.execute.mock.calls.some(([sql]) => /DELETE FROM administracion_medicacion/i.test(String(sql)))).toBe(false);
        log.mockRestore();
    });

    it('trata como éxito un INSERT con respuesta perdida si encuentra el consumo esperado', async () => {
        const fallo = new Error('se perdió la respuesta de MySQL');
        responder([], [{ id_insumo: 4, cantidad: 1, id_paciente: 8 }], [{ piso: 2 }], [{ stock: 5 }], { insertId: 25 }, fallo, [{ id_insumo: 4, cantidad: 1, piso: 2 }]);

        await expect(new AdministracionMedicacionRepositoryMysq().administrar(1, 7, horario, horario, 1))
            .resolves.toBe(25);
        expect(mocks.execute).toHaveBeenCalledTimes(7);
        expect(mocks.execute.mock.calls.some(([sql]) => /DELETE FROM administracion_medicacion/i.test(String(sql)))).toBe(false);
    });

    it('conserva la administración si no se puede determinar el estado del consumo', async () => {
        const falloInsert = new Error('falló insert en consumos');
        const falloLectura = new Error('falló la lectura de confirmación');
        const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        responder([], [{ id_insumo: 4, cantidad: 1, id_paciente: 8 }], [{ piso: 2 }], [{ stock: 5 }], { insertId: 25 }, falloInsert, falloLectura);

        await expect(new AdministracionMedicacionRepositoryMysq().administrar(1, 7, horario, horario, 1))
            .rejects.toBe(falloInsert);
        expect(mocks.execute).toHaveBeenCalledTimes(7);
        expect(mocks.execute.mock.calls.some(([sql]) => /DELETE FROM administracion_medicacion/i.test(String(sql)))).toBe(false);
        log.mockRestore();
    });

    it('detecta administraciones sin consumo sin interrumpir el listado', async () => {
        const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        responder([], [{ id: 25 }]);
        const indicaciones = await new AdministracionMedicacionRepositoryMysq().obtenerTodas();

        expect(indicaciones).toEqual([]);
        expect(mocks.execute.mock.calls[1]?.[0]).toContain('LEFT JOIN consumos_medicacion');
        expect(mocks.execute.mock.calls[1]?.[0]).toContain('cm.id_administracion IS NULL');
        expect(log).toHaveBeenCalledWith(expect.stringContaining('25'));
        log.mockRestore();
    });
});
