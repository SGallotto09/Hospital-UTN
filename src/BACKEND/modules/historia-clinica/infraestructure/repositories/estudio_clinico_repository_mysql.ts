import { Database } from '../../../../database/connectionDB.js';
import type { EstudioClinicoRepository } from '../../domain/repositories/estudio_clinico_repository.js';
import type { EstudioClinico } from '../../domain/entities/estudio_clinico.js';

export class EstudioClinicoRepositoryMySQL implements EstudioClinicoRepository {
    private readonly db = Database.getInstance();

    async obtenerPorPaciente(idPaciente: number): Promise<EstudioClinico[]> {
        const [filas] = await this.db.query(
            'SELECT * FROM estudios_clinicos WHERE id_paciente = ? ORDER BY fecha_registro DESC, id DESC',
            [idPaciente],
        );
        return filas as EstudioClinico[];
    }
}
