
export interface ResultadoCalculo {
  montoPaciente: number;
  montoCobertura: number;
}

export interface ICoberturaStrategy {
  calcular(valorBase: number): ResultadoCalculo;
}
