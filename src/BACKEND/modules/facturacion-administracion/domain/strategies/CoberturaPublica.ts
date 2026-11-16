
import type {
  ICoberturaStrategy,
  ResultadoCalculo
} from './ICoberturaStrategy.js';

export class CoberturaPublica implements ICoberturaStrategy {

  calcular(valorBase: number): ResultadoCalculo {
    return {
      montoPaciente: 0,
      montoCobertura: valorBase
    };
  }

}
