import { Database } from '../../../../database/connectionDB.js';
import type { EvolucionMedicaRepository, DatosNuevaEvolucion } from '../../domain/repositories/evolucion_medica_repository.js';
import type { EvolucionMedica } from '../../domain/entities/evolucion_medica.js';

export class EvolucionMedicaRepositoryMySQL implements EvolucionMedicaRepository {
    private readonly db = Database.getInstance();

    async guardar(datos: DatosNuevaEvolucion): Promise<EvolucionMedica> {
        const [resultado] = await this.db.query(
            `INSERT INTO evoluciones_medicas (id_paciente, descripcion, diagnostico, id_medico)
             VALUES (?, ?, ?, ?)`,
            [datos.id_paciente, datos.descripcion, datos.diagnostico, datos.id_medico]
        );
        const id = (resultado as { insertId: number }).insertId;
        const [filas] = await this.db.query('SELECT * FROM evoluciones_medicas WHERE id = ?', [id]);
        const evolucion = (filas as EvolucionMedica[])[0];
        if (!evolucion) throw new Error('No se pudo recuperar la evolución');
        return evolucion;
    }

    async obtenerPorPaciente(idPaciente: number): Promise<EvolucionMedica[]> {
        const [filas] = await this.db.query(
            'SELECT * FROM evoluciones_medicas WHERE id_paciente = ? ORDER BY fecha_registro DESC, id DESC',
            [idPaciente]
        );
        return filas as EvolucionMedica[];
    }
}
