import type { HistoriaClinica } from "../entities/historia_clinica.js";

export interface HistoriaClinicaRepository {

    obtenerPorId(id: number): Promise<HistoriaClinica | null>;

    obtenerPorPaciente(idPaciente: number): Promise<HistoriaClinica[]>;

}
