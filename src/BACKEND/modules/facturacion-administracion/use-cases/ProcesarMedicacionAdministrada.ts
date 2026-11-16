
import { Cargo } from '../domain/entities/Cargo.js';

import type { IAdministracionMedicacionRepository } from '../domain/repositories/IAdministracionMedicacionRepository.js';

import type { ICuentaFacturacionRepository } from '../domain/repositories/ICuentaFacturacionRepository.js';

import { CalcularCostoMedicacion } from './CalcularCostoMedicacion.js';

import { RegistrarCargoFacturacion } from './RegistrarCargoFacturacion.js';

export interface EventoMedicacionAdministrada {
  idAdministracionMedicacion: number;
  cantidadAdministrada: number;
}

export class ProcesarMedicacionAdministrada {

  constructor(
    private administraciones: IAdministracionMedicacionRepository,
    private cuentas: ICuentaFacturacionRepository,
    private calcularCosto: CalcularCostoMedicacion,
    private registrarCargo: RegistrarCargoFacturacion
  ) {}

  async ejecutar(
    evento: EventoMedicacionAdministrada
  ): Promise<Cargo> {

    const {
      idAdministracionMedicacion,
      cantidadAdministrada
    } = evento;

    if (
      !Number.isSafeInteger(idAdministracionMedicacion) ||
      idAdministracionMedicacion <= 0
    ) {
      throw new Error(
        'La administración de medicación no es válida'
      );
    }

    if (
      !Number.isFinite(cantidadAdministrada) ||
      cantidadAdministrada <= 0
    ) {
      throw new Error(
        'La cantidad administrada debe ser mayor a cero'
      );
    }

    // Consultar la administración registrada por Enfermería.
    const datos = await this.administraciones.obtenerDatos(
      idAdministracionMedicacion
    );

    if (datos === null) {
      throw new Error(
        'No se encontró la administración de medicación'
      );
    }

if (datos.estado.trim().toLowerCase() !== 'administrada') {
  throw new Error(
    'No se puede facturar una medicación que todavía no fue administrada'
  );
}


    // La cantidad indicada corresponde al tratamiento completo.
    // No debe confundirse con la dosis efectivamente administrada.
    if (
      cantidadAdministrada > datos.cantidadTotalTratamiento
    ) {
      throw new Error(
        'La cantidad administrada supera el total indicado'
      );
    }

    // Buscar la cuenta activa del paciente.
    const cuenta = await this.cuentas.buscarActivaPorPaciente(
      datos.idPaciente
    );

    if (cuenta === null) {
      throw new Error(
        'El paciente no tiene una cuenta de facturación activa'
      );
    }

    // Calcular únicamente lo que se administró.
    const importe = await this.calcularCosto.ejecutar(
      datos.idInsumo,
      cantidadAdministrada
    );

    const cargo = new Cargo(
      0,
      cuenta.id,
      'Insumos de Farmacia',
      importe,
      idAdministracionMedicacion
    );

    // Este caso de uso ya evita cobrar dos veces
    // la misma administración.
    return this.registrarCargo.ejecutar(cargo);
  }
}
