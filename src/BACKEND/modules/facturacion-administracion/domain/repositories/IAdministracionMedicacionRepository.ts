
export interface DatosAdministracionMedicacion {
  idPaciente: number;
  idInsumo: number;
  cantidadTotalTratamiento: number;
  estado: string;
}

export interface IAdministracionMedicacionRepository {

  obtenerDatos(
    idAdministracionMedicacion: number
  ): Promise<DatosAdministracionMedicacion | null>;

}
