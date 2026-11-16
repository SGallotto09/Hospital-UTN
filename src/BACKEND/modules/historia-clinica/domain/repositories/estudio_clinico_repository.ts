import type { EstudioClinico } from '../entities/estudio_clinico.js';

export interface EstudioClinicoRepository {
    obtenerPorPaciente(idPaciente: number): Promise<EstudioClinico[]>;
}
