// Lo implementa Admisión mediante su API pública; no consultar sus tablas desde este módulo.
export interface IPacienteGateway {
  existe(idPaciente: number): Promise<boolean>
}
