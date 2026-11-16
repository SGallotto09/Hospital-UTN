
export class Prestacion {

  constructor(
    public id: number,
    public nombre: string,
    public valorBase: number
  ) {
    if (valorBase < 0) {
      throw new Error('El valor de la prestación no puede ser negativo');
    }
  }

}
