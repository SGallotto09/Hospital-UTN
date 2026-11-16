import type { AntecedenteFamiliar } from '../entities/antecedentes_familiar.js';

export type DatosNuevoAntecedente = Omit<AntecedenteFamiliar, 'id' | 'fecha_registro'>;
export interface AntecedenteFamiliarRepository {
    guardar(datos: DatosNuevoAntecedente): Promise<AntecedenteFamiliar>;
    obtenerPorPaciente(idPaciente: number): Promise<AntecedenteFamiliar[]>;
}
