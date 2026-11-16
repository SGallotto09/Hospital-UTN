import type { Alergia } from '../entities/alergia.js';

export type DatosNuevaAlergia = Omit<Alergia, 'id' | 'fecha_registro'>;

export interface AlergiaRepository {
    guardar(datos: DatosNuevaAlergia): Promise<Alergia>;

    obtenerPorPaciente(idPaciente: number): Promise<Alergia[]>;
}
