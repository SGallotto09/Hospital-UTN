import type { EvolucionMedica } from '../entities/evolucion_medica.js';

export type DatosNuevaEvolucion = Omit<EvolucionMedica, 'id' | 'fecha_registro'>;
export interface EvolucionMedicaRepository {
    guardar(datos: DatosNuevaEvolucion): Promise<EvolucionMedica>;
    obtenerPorPaciente(idPaciente: number): Promise<EvolucionMedica[]>;
}
