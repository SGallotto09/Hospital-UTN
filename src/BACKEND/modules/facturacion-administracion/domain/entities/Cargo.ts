
export class Cargo {

  constructor(
    public id: number,
    public idCuenta: number,
    public concepto: string,
    public importe: number,
    public idAdministracionMedicacion: number | null = null
  ) {
    if (importe < 0) {
      throw new Error('El importe del cargo no puede ser negativo');
    }
  }

}
