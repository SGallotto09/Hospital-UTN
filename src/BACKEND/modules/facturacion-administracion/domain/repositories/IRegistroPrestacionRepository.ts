
export type TipoCoberturaFacturacion =
  | 'publica'
  | 'prepaga'
  | 'particular';

export interface DatosRegistroPrestacion {
  idCuenta: number;
  concepto: string;
  tipoCobertura: TipoCoberturaFacturacion;
  montoPaciente: number;
  montoCobertura: number;
  entidadDestino: string | null;
}

export interface ResultadoRegistroPrestacion {
  idCargo: number;
  idReclamo: number | null;
}

export interface IRegistroPrestacionRepository {
  registrar(
    datos: DatosRegistroPrestacion
  ): Promise<ResultadoRegistroPrestacion>;
}
