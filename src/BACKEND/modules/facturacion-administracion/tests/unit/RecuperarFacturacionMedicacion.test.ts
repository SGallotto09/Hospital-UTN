import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { iniciarFacturacionMedicacion } from '../../infraestructure/IniciarFacturacionMedicacion.js';
import { ProcesarMedicacionAdministrada } from '../../use-cases/ProcesarMedicacionAdministrada.js';
import { Cargo } from '../../domain/entities/Cargo.js';
import { event_bus } from '../../../../events/event_bus.js';
import { AdministracionMedicacionMySQLRepository } from '../../infraestructure/AdministracionMedicacionMySQLRepository.js';

const mocks = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('../../../../database/connectionDB.js', () => ({
  Database: { getInstance: () => ({ query: mocks.query }) }
}));

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

function preparar() {
  const ejecutar = vi.spyOn(ProcesarMedicacionAdministrada.prototype, 'ejecutar')
    .mockResolvedValue(new Cargo(10, 1, 'Insumos de Farmacia', 100, 20));
  const procesar = iniciarFacturacionMedicacion();
  return { ejecutar, procesar };
}

describe('recuperación de facturación desde consumos confirmados', () => {
  it('consulta el insumo y la cantidad guardados al administrar para no depender de cambios posteriores de la indicación', async () => {
    mocks.query.mockResolvedValueOnce([[{
      idPaciente: 1, idInsumo: 4, cantidadTotalTratamiento: 2, estado: 'Administrada'
    }], []]);
    await expect(new AdministracionMedicacionMySQLRepository().obtenerDatos(20)).resolves.toEqual({
      idPaciente: 1, idInsumo: 4, cantidadTotalTratamiento: 2, estado: 'Administrada'
    });
    expect(mocks.query.mock.calls[0]?.[0]).toContain('COALESCE(consumo.cantidad, im.cantidad)');
    expect(mocks.query.mock.calls[0]?.[0]).toContain('COALESCE(consumo.id_insumo, im.id_insumo)');
    expect(mocks.query.mock.calls[0]?.[1]).toEqual([20]);
  });
  it('no inicia trabajo ni registra otro listener hasta que el procesador lo invoque', async () => {
    const listeners = event_bus.listenerCount('MedicacionAdministrada');
    const { ejecutar, procesar } = preparar();
    expect(mocks.query).not.toHaveBeenCalled();
    expect(event_bus.listenerCount('MedicacionAdministrada')).toBe(listeners);
    mocks.query.mockResolvedValueOnce([[{ id_administracion: 20, cantidad: 2 }], []]);
    await procesar();
    expect(ejecutar).toHaveBeenCalledExactlyOnceWith({ idAdministracionMedicacion: 20, cantidadAdministrada: 2 });
    const sql = mocks.query.mock.calls[0]?.[0] as string;
    expect(sql).toContain('FROM consumos_medicacion');
    expect(sql).toContain('cargo.id IS NULL');
    expect(sql).not.toContain("estado = 'procesado'");
  });

  it('no vuelve a generar cargos que la consulta excluye, incluso al reiniciar', async () => {
    const { ejecutar, procesar } = preparar();
    mocks.query.mockResolvedValueOnce([[{ id_administracion: 20, cantidad: 2 }], []])
      .mockResolvedValue([[], []]);
    await procesar();
    await procesar();
    await iniciarFacturacionMedicacion()();
    expect(ejecutar).toHaveBeenCalledOnce();
    expect(mocks.query.mock.calls[2]?.[1]).toEqual([0]);
  });

  it('continúa con otras administraciones y vuelve a intentar la que falló al completar la vuelta', async () => {
    const { ejecutar, procesar } = preparar();
    ejecutar.mockRejectedValueOnce(new Error('Todavía no hay cuenta activa'));
    mocks.query.mockResolvedValueOnce([[{ id_administracion: 20, cantidad: 2 }, { id_administracion: 21, cantidad: 1 }], []])
      .mockResolvedValueOnce([[], []])
      .mockResolvedValueOnce([[{ id_administracion: 20, cantidad: 2 }], []]);
    await procesar();
    await procesar();
    await procesar();
    expect(ejecutar).toHaveBeenCalledTimes(3);
    expect(mocks.query.mock.calls.map(([, valores]) => valores)).toEqual([[0], [21], [0]]);
    expect(ejecutar.mock.calls[2]?.[0]).toEqual({ idAdministracionMedicacion: 20, cantidadAdministrada: 2 });
  });

  it('un error de lectura permite repetir desde el mismo punto', async () => {
    const { ejecutar, procesar } = preparar();
    mocks.query.mockRejectedValueOnce(new Error('Conexión perdida')).mockResolvedValueOnce([[], []]);
    await expect(procesar()).rejects.toThrow('Conexión perdida');
    await procesar();
    expect(mocks.query.mock.calls.map(([, valores]) => valores)).toEqual([[0], [0]]);
    expect(ejecutar).not.toHaveBeenCalled();
  });
});
