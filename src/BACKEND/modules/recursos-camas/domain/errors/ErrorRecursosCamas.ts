export type CodigoError =
  | 'DATOS_INVALIDOS'
  | 'CAMA_NO_ENCONTRADA'
  | 'PACIENTE_NO_ENCONTRADO'
  | 'PACIENTE_YA_ASIGNADO'
  | 'CAMA_NO_DISPONIBLE'
  | 'TRANSICION_INVALIDA'
  | 'TRANSACCIONES_NO_DISPONIBLES'
  | 'AUTENTICACION_REQUERIDA'
  | 'ACCESO_DENEGADO'
  | 'INSUMO_NO_ENCONTRADO'
  | 'STOCK_INSUFICIENTE'
  | 'PISO_INSUMO_INVALIDO'
  | 'CONSUMO_INCONSISTENTE'
  | 'DEDUPLICACION_NO_DISPONIBLE'

export class ErrorRecursosCamas extends Error {
  constructor(
    public readonly codigo: CodigoError,
    mensaje: string,
  ) {
    super(mensaje)
    this.name = 'ErrorRecursosCamas'
  }
}

export function validarId(valor: number, campo: string): void {
  if (!Number.isSafeInteger(valor) || valor <= 0 || valor > 2147483647) {
    throw new ErrorRecursosCamas('DATOS_INVALIDOS', `${campo} debe ser un entero positivo válido.`)
  }
}
