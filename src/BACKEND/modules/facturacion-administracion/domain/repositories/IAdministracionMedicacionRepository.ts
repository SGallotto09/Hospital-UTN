
export interface DatosAdministracionMedicacion {
  idPaciente: number;
  idInsumo: number;
  cantidad: number;
  estado: string;
}

export interface IAdministracionMedicacionRepository {

  obtenerDatos(
    idAdministracionMedicacion: number
  ): Promise<DatosAdministracionMedicacion | null>;

}
