import { Database } from '../../../../database/connectionDB.js';
import type {
    EvolucionMedicaRepository,
    DatosNuevaEvolucion,
} from '../../domain/repositories/evolucion_medica_repository.js';
import type { EvolucionMedica } from '../../domain/entities/evolucion_medica.js';

export class EvolucionMedicaRepositoryMySQL implements EvolucionMedicaRepository {
    private readonly db = Database.getInstance();

    async guardar(datos: DatosNuevaEvolucion): Promise<EvolucionMedica> {
        return this.db.withTransaction(async (conexion) => {
            const [resultado] = await conexion.execute(
                `INSERT INTO evoluciones_medicas (id_paciente, descripcion, diagnostico, id_medico)
             VALUES (?, ?, ?, ?)`,
                [datos.id_paciente, datos.descripcion, datos.diagnostico, datos.id_medico],
            );
            const id = (resultado as { insertId: number }).insertId;
            const [filas] = await conexion.execute(
                `SELECT r.*, CONCAT(u.nombre, ' ', u.apellido) AS autor FROM evoluciones_medicas r JOIN usuarios u ON u.id = r.id_medico WHERE r.id = ?`,
                [id],
            );
            const evolucion = (filas as EvolucionMedica[])[0];
            if (!evolucion) throw new Error('No se pudo recuperar la evolución');
            return evolucion;
        });
    }

    async obtenerPorPaciente(idPaciente: number): Promise<EvolucionMedica[]> {
        const [filas] = await this.db.query(
            `SELECT r.*, CONCAT(u.nombre, ' ', u.apellido) AS autor FROM evoluciones_medicas r JOIN usuarios u ON u.id = r.id_medico WHERE r.id_paciente = ? ORDER BY r.fecha_registro DESC, r.id DESC`,
            [idPaciente],
        );
        return filas as EvolucionMedica[];
    }
}
