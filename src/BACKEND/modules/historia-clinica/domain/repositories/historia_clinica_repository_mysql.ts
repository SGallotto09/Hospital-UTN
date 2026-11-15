
import { Database } from '../../../../database/connectionDB.js';

import type { HistoriaClinicaRepository } from '../../domain/repositories/historia_clinica_repository.js';
import type { HistoriaClinica } from '../../domain/entities/historia_clinica.js';

export class HistoriaClinicaRepositoryMySQL implements HistoriaClinicaRepository {

    private readonly db = Database.getInstance();

    async obtenerPorId(id: number): Promise<HistoriaClinica | null> {
        const [filas] = await this.db.query(
            'SELECT * FROM historias_clinicas WHERE id = ?',
            [id]
        );

        const historias = filas as HistoriaClinica[];

        return historias.length > 0 ? historias[0] : null;
    }

    async obtenerPorPaciente(idPaciente: number): Promise<HistoriaClinica[]> {
        const [filas] = await this.db.query(
            'SELECT * FROM historias_clinicas WHERE id_paciente = ?',
            [idPaciente]
        );

        return filas as HistoriaClinica[];
    }
}
