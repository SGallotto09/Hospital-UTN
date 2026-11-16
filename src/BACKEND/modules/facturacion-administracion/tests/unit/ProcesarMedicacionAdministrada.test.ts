
import { describe, it, expect, vi } from 'vitest';

import { Cargo } from '../../domain/entities/Cargo.js';
import { CuentaFacturacion } from '../../domain/entities/CuentaFacturacion.js';

import { CalcularCostoMedicacion } from '../../use-cases/CalcularCostoMedicacion.js';
import { RegistrarCargoFacturacion } from '../../use-cases/RegistrarCargoFacturacion.js';
import { ProcesarMedicacionAdministrada } from '../../use-cases/ProcesarMedicacionAdministrada.js';

function prepararPrueba(cargoExistente: Cargo | null = null) {

  const administraciones = {
    obtenerDatos: vi.fn().mockResolvedValue({
      idPaciente: 1,
      idInsumo: 5,
      cantidadTotalTratamiento: 3,
      estado: 'administrada'
    })
  };

  const cuentas = {
    buscarActivaPorPaciente: vi.fn().mockResolvedValue(
      new CuentaFacturacion(10, 1)
    ),
    crear: vi.fn()
  };

  const precios = {
    obtenerPrecio: vi.fn().mockResolvedValue(2500)
  };

  const cargos = {
    buscarPorAdministracion: vi.fn().mockResolvedValue(
      cargoExistente
    ),
    guardar: vi.fn(async (cargo: Cargo) =>
      new Cargo(
        20,
        cargo.idCuenta,
        cargo.concepto,
        cargo.importe,
        cargo.idAdministracionMedicacion
      )
    )
  };

  const procesar = new ProcesarMedicacionAdministrada(
    administraciones,
    cuentas,
    new CalcularCostoMedicacion(precios),
    new RegistrarCargoFacturacion(cargos)
  );

  return { procesar, cargos, administraciones };
}

describe('ProcesarMedicacionAdministrada', () => {

  it('cobra solo la cantidad administrada', async () => {

    const { procesar, cargos } = prepararPrueba();

    const cargo = await procesar.ejecutar({
      idAdministracionMedicacion: 15,
      cantidadAdministrada: 1
    });

    expect(cargo.importe).toBe(2500);
    expect(cargo.idAdministracionMedicacion).toBe(15);
    expect(cargos.guardar).toHaveBeenCalledTimes(1);
  });

  it('rechaza cantidades superiores al tratamiento', async () => {

    const { procesar, cargos } = prepararPrueba();

    await expect(
      procesar.ejecutar({
        idAdministracionMedicacion: 15,
        cantidadAdministrada: 4
      })
    ).rejects.toThrow();

    expect(cargos.guardar).not.toHaveBeenCalled();
  });

  it('evita cobrar dos veces la misma administración', async () => {

    const existente = new Cargo(
      20, 10, 'Insumos de Farmacia', 2500, 15
    );

    const { procesar, cargos } = prepararPrueba(existente);

    await expect(
      procesar.ejecutar({
        idAdministracionMedicacion: 15,
        cantidadAdministrada: 1
      })
    ).rejects.toThrow(
      'Esta administración de medicación ya fue cobrada'
    );

    expect(cargos.guardar).not.toHaveBeenCalled();
  });

  it('no cobra medicamentos pendientes de administrar', async () => {

    const { procesar, cargos, administraciones } = prepararPrueba();

    administraciones.obtenerDatos.mockResolvedValue({
      idPaciente: 1,
      idInsumo: 5,
      cantidadTotalTratamiento: 3,
      estado: 'pendiente'
    });

    await expect(
      procesar.ejecutar({
        idAdministracionMedicacion: 15,
        cantidadAdministrada: 1
      })
    ).rejects.toThrow(
      'No se puede facturar una medicación que todavía no fue administrada'
    );

    expect(cargos.guardar).not.toHaveBeenCalled();
  });

});
