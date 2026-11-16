
import { CoberturaPublica } from '../domain/strategies/CoberturaPublica.js';
import { CoberturaPrepaga } from '../domain/strategies/CoberturaPrepaga.js';
import { CoberturaParticular } from '../domain/strategies/CoberturaParticular.js';

import type { ICoberturaStrategy } from '../domain/strategies/ICoberturaStrategy.js';

import type {
  IRegistroPrestacionRepository,
  TipoCoberturaFacturacion,
  ResultadoRegistroPrestacion
} from '../domain/repositories/IRegistroPrestacionRepository.js';

import { CalcularCostoPrestacion } from './CalcularCostoPrestacion.js';

export interface DatosFacturarPrestacion {
  idCuenta: number;
  concepto: string;
  valorBase: number;
  tipoCobertura: TipoCoberturaFacturacion;
  copago?: number;
  entidadDestino?: string;
}

export interface ResultadoFacturarPrestacion
  extends ResultadoRegistroPrestacion {
  montoPaciente: number;
  montoCobertura: number;
}

function importeValido(valor: number): boolean {
  return (
    typeof valor === 'number' &&
    Number.isFinite(valor) &&
    valor >= 0 &&
    valor <= 99999999.99 &&
    Math.abs(valor * 100 - Math.round(valor * 100)) < 0.000001
  );
}

export class FacturarPrestacion {

  constructor(
    private repositorio: IRegistroPrestacionRepository
  ) {}

  async ejecutar(
    datos: DatosFacturarPrestacion
  ): Promise<ResultadoFacturarPrestacion> {

    if (
      !Number.isSafeInteger(datos.idCuenta) ||
      datos.idCuenta <= 0
    ) {
      throw new Error(
        'La cuenta de facturación no es válida'
      );
    }

    if (
      typeof datos.concepto !== 'string' ||
      datos.concepto.trim().length === 0 ||
      datos.concepto.trim().length > 100
    ) {
      throw new Error(
        'El concepto de la prestación no es válido'
      );
    }

    if (!importeValido(datos.valorBase)) {
      throw new Error(
        'El valor base de la prestación no es válido'
      );
    }

    let estrategia: ICoberturaStrategy;
    let entidadDestino: string | null = null;

    switch (datos.tipoCobertura) {

      case 'publica':
        estrategia = new CoberturaPublica();
        entidadDestino = 'Estado';
        break;

      case 'prepaga':

        if (
          datos.copago === undefined ||
          !importeValido(datos.copago) ||
          datos.copago > datos.valorBase
        ) {
          throw new Error(
            'El copago de la prepaga no es válido'
          );
        }

        if (
          typeof datos.entidadDestino !== 'string' ||
          datos.entidadDestino.trim().length === 0 ||
          datos.entidadDestino.trim().length > 100
        ) {
          throw new Error(
            'Debe indicar el nombre de la prepaga'
          );
        }

        estrategia = new CoberturaPrepaga(datos.copago);
        entidadDestino = datos.entidadDestino.trim();
        break;

      case 'particular':
        estrategia = new CoberturaParticular();
        break;

      default:
        throw new Error(
          'El tipo de cobertura no es válido'
        );
    }

    // Aplicar la estrategia correspondiente.
    const calcular = new CalcularCostoPrestacion(estrategia);

    const resultado = calcular.ejecutar(datos.valorBase);

    const montoPaciente =
      Math.round(resultado.montoPaciente * 100) / 100;

    const montoCobertura =
      Math.round(resultado.montoCobertura * 100) / 100;

    // La suma debe coincidir con el valor de la prestación.
    if (
      !importeValido(montoPaciente) ||
      !importeValido(montoCobertura) ||
      Math.round((montoPaciente + montoCobertura) * 100) !==
        Math.round(datos.valorBase * 100)
    ) {
      throw new Error(
        'Los importes calculados no coinciden con el valor base'
      );
    }

    // Guardar cargo y reclamo mediante una transacción.
    const registro = await this.repositorio.registrar({
      idCuenta: datos.idCuenta,
      concepto: datos.concepto.trim(),
      tipoCobertura: datos.tipoCobertura,
      montoPaciente,
      montoCobertura,
      entidadDestino
    });

    return {
      ...registro,
      montoPaciente,
      montoCobertura
    };
  }
}
