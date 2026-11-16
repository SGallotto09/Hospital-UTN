
import { Database } from '../../../../database/connectionDB.js';
import type {DashboardRepository,PacienteDashboard} from '../../domain/repositories/dashboard_repository.js';

export class DashboardRepositoryMySQL implements DashboardRepository {
    private readonly db = Database.getInstance();

    async obtenerPacientes(): Promise<PacienteDashboard[]> {
        const [filas] = await this.db.query(
            `SELECT
                p.id,
                p.nombre,
                p.apellido,
                c.habitacion,
                c.piso,
                sv.presion_arterial,
                sv.frecuencia_cardiaca,
                sv.temperatura,
                sv.fecha_hora
            FROM asignaciones_camas ac
            INNER JOIN pacientes p
                ON p.id = ac.id_paciente
            INNER JOIN camas c
                ON c.id = ac.id_cama
            LEFT JOIN signos_vitales sv
                ON sv.id = (
                    SELECT sv2.id
                    FROM signos_vitales sv2
                    WHERE sv2.id_paciente = p.id
                    ORDER BY sv2.fecha_hora DESC, sv2.id DESC
                    LIMIT 1
                )
            WHERE ac.fecha_egreso IS NULL
            ORDER BY p.apellido, p.nombre`
        );

        return filas as PacienteDashboard[];
    }
}
