import { Database } from '../../../../database/connectionDB.js';

import type { AdministracionMedicacionRepository } from '../../domain/repositories/administracion_medicacion_repository.js';
import type { AdministracionMedicacion } from '../../domain/entities/administracion_medicacion.js';

export class AdministracionMedicacionRepositoryMysq implements AdministracionMedicacionRepository {

    private readonly db = Database.getInstance();

   async obtenerTodas(): Promise<AdministracionMedicacion[]> {
        const sql = `
            SELECT
                im.id AS id_indicacion_medica,
                p.id AS id_paciente,
                p.nombre,
                p.apellido,
                c.habitacion,
                i.nombre AS medicamento,
                im.cantidad,
                im.fecha,
                COALESCE(am.estado, 'Pendiente') AS estado
            FROM indicacion_medica im
            INNER JOIN pacientes p
                ON p.id = im.id_paciente
            INNER JOIN insumos i
                ON i.id = im.id_insumo
            INNER JOIN asignaciones_camas ac
                ON ac.id_paciente = p.id
            INNER JOIN camas c
                ON c.id = ac.id_cama
            LEFT JOIN administracion_medicacion am
                ON am.id_indicacion_medica = im.id
            WHERE ac.fecha_egreso IS NULL
        `;

        const [filas] = await this.db.query(sql);

        return filas as AdministracionMedicacion[];
    }
}