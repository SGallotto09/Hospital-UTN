
import type {
  ICoberturaStrategy,
  ResultadoCalculo
} from './ICoberturaStrategy.js';

export class CoberturaPrepaga implements ICoberturaStrategy {

  private copago: number;

  constructor(copago: number) {
    this.copago = copago;
  }


calcular(valorBase: number): ResultadoCalculo {

  if (this.copago < 0 || this.copago > valorBase) {
    throw new Error('El copago no es válido');
  }

  return {
    montoPaciente: this.copago,
    montoCobertura: valorBase - this.copago
    };
  }
}