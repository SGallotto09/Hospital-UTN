import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardRepositoryMySQL } from '../../infraestructure/repositories/dashboard_repository_mysql.js';
import { PacienteInternadoRepositoryMysql } from '../../infraestructure/repositories/paciente_internado_repository_mysql.js';

const mocks = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock('mysql2/promise', () => ({ default: { createPool: () => ({ execute: mocks.execute }) } }));

beforeEach(() => vi.resetAllMocks());

describe('consultas de internación activa', () => {
    it('usa el signo vital más reciente de la internación actual en pacientes internados', async () => {
        const paciente = { id: 2, nombre: 'Ana', apellido: 'Prueba' };
        mocks.execute.mockResolvedValueOnce([[paciente], []]);

        await expect(new PacienteInternadoRepositoryMysql().obtenerInternados()).resolves.toEqual([paciente]);
        const sql = String(mocks.execute.mock.calls[0]?.[0]);
        expect(sql).toContain('fecha_hora >= ac.fecha_ingreso');
        expect(sql).toContain('ORDER BY sv_ultimo.fecha_hora DESC, sv_ultimo.id DESC');
    });

    it('usa el signo vital más reciente de la internación actual en el dashboard', async () => {
        const paciente = { id: 2, nombre: 'Ana', apellido: 'Prueba' };
        mocks.execute.mockResolvedValueOnce([[paciente], []]);

        await expect(new DashboardRepositoryMySQL().obtenerPacientes()).resolves.toEqual([paciente]);
        const sql = String(mocks.execute.mock.calls[0]?.[0]);
        expect(sql).toContain('fecha_hora >= ac.fecha_ingreso');
        expect(sql).toContain('ORDER BY sv2.fecha_hora DESC, sv2.id DESC');
    });
});
