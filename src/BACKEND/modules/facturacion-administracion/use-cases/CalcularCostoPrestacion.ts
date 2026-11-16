
import type {
  ICoberturaStrategy,
  ResultadoCalculo
} from '../domain/strategies/ICoberturaStrategy.js';

export class CalcularCostoPrestacion {

  private estrategia: ICoberturaStrategy;

  constructor(estrategia: ICoberturaStrategy) {
    this.estrategia = estrategia;
  }

  ejecutar(valorBase: number): ResultadoCalculo {
    if (valorBase < 0) {
      throw new Error('El valor de la prestación no puede ser negativo');
    }

    return this.estrategia.calcular(valorBase);
  }

}
