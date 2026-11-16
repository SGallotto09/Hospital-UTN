// Lo implementa Admisión mediante su API pública; no consultar sus tablas desde este módulo.
export interface PacienteParaAsignacion {
  id: number
  nombre: string
  apellido: string
  dni: string
}

export interface IPacienteGateway {
  existe(idPaciente: number): Promise<boolean>
  buscarPorDni(dni: string): Promise<PacienteParaAsignacion | null>
}
