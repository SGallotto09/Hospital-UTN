
import type {
  ICoberturaStrategy,
  ResultadoCalculo
} from './ICoberturaStrategy.js';

export class CoberturaParticular implements ICoberturaStrategy {

  calcular(valorBase: number): ResultadoCalculo {
    return {
      montoPaciente: valorBase,
      montoCobertura: 0
    };
  }

}
