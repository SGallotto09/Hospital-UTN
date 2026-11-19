import { Database } from '../../../../database/connectionDB.js';
import type { AntecedenteFamiliar } from '../../domain/entities/antecedentes_familiar.js';
import type {
    AntecedenteFamiliarRepository,
    DatosNuevoAntecedente,
} from '../../domain/repositories/antecedente_familiar_repository.js';

export class AntecedenteFamiliarRepositoryMySQL implements AntecedenteFamiliarRepository {
    private readonly db = Database.getInstance();

    async guardar(datos: DatosNuevoAntecedente): Promise<AntecedenteFamiliar> {
        return this.db.withTransaction(async (conexion) => {
            const [resultado] = await conexion.execute(
                `INSERT INTO antecedentes_familiares
             (id_paciente, parentesco, enfermedad, observaciones, id_medico)
             VALUES (?, ?, ?, ?, ?)`,
                [
                    datos.id_paciente,
                    datos.parentesco,
                    datos.enfermedad,
                    datos.observaciones,
                    datos.id_medico,
                ],
            );
            const id = (resultado as { insertId: number }).insertId;
            const [filas] = await conexion.execute(
                `SELECT r.*, CONCAT(u.nombre, ' ', u.apellido) AS autor FROM antecedentes_familiares r JOIN usuarios u ON u.id = r.id_medico WHERE r.id = ?`,
                [id],
            );
            const antecedente = (filas as AntecedenteFamiliar[])[0];
            if (!antecedente) throw new Error('No se pudo recuperar el antecedente');
            return antecedente;
        });
    }

    async obtenerPorPaciente(idPaciente: number): Promise<AntecedenteFamiliar[]> {
        const [filas] = await this.db.query(
            `SELECT r.*, CONCAT(u.nombre, ' ', u.apellido) AS autor FROM antecedentes_familiares r JOIN usuarios u ON u.id = r.id_medico WHERE r.id_paciente = ? ORDER BY r.fecha_registro DESC, r.id DESC`,
            [idPaciente],
        );
        return filas as AntecedenteFamiliar[];
    }
}
