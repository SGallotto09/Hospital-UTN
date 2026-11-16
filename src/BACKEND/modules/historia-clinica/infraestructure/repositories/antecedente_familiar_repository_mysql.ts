import { Database } from '../../../../database/connectionDB.js';
import type { AntecedenteFamiliar } from '../../domain/entities/antecedentes_familiar.js';
import type { AntecedenteFamiliarRepository, DatosNuevoAntecedente } from '../../domain/repositories/antecedente_familiar_repository.js';

export class AntecedenteFamiliarRepositoryMySQL implements AntecedenteFamiliarRepository {
    private readonly db = Database.getInstance();

    async guardar(datos: DatosNuevoAntecedente): Promise<AntecedenteFamiliar> {
        const [resultado] = await this.db.query(
            `INSERT INTO antecedentes_familiares
             (id_paciente, parentesco, enfermedad, observaciones, id_medico)
             VALUES (?, ?, ?, ?, ?)`,
            [datos.id_paciente, datos.parentesco, datos.enfermedad, datos.observaciones, datos.id_medico]
        );
        const id = (resultado as { insertId: number }).insertId;
        const [filas] = await this.db.query('SELECT * FROM antecedentes_familiares WHERE id = ?', [id]);
        const antecedente = (filas as AntecedenteFamiliar[])[0];
        if (!antecedente) throw new Error('No se pudo recuperar el antecedente');
        return antecedente;
    }

    async obtenerPorPaciente(idPaciente: number): Promise<AntecedenteFamiliar[]> {
        const [filas] = await this.db.query(
            'SELECT * FROM antecedentes_familiares WHERE id_paciente = ? ORDER BY fecha_registro DESC, id DESC',
            [idPaciente]
        );
        return filas as AntecedenteFamiliar[];
    }
}
