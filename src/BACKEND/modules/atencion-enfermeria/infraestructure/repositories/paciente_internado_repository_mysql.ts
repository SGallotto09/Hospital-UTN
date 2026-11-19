import { Database } from '../../../../database/connectionDB.js';
import type { PacienteInternadoRepository } from '../../domain/repositories/paciente_internado_repository.js';
import type { PacienteInternado } from '../../domain/entities/paciente_internado.js';

export class PacienteInternadoRepositoryMysql implements PacienteInternadoRepository {
    private readonly db = Database.getInstance();

    async obtenerInternados(buscar?: string): Promise<Omit<PacienteInternado, 'estado'>[]>{
        let sql = `
            SELECT
                p.id,
                p.nombre,
                p.apellido,
                c.habitacion,
                c.piso,
                ac.fecha_ingreso,
                sv.presion_arterial,
                sv.frecuencia_cardiaca,
                sv.temperatura
            FROM pacientes p
            INNER JOIN asignaciones_camas ac
                ON p.id = ac.id_paciente
            INNER JOIN camas c
                ON ac.id_cama = c.id

            LEFT JOIN signos_vitales sv
                ON sv.id = (
                    SELECT sv_ultimo.id
                    FROM signos_vitales sv_ultimo
                    WHERE sv_ultimo.id_paciente = p.id
                        AND sv_ultimo.fecha_hora >= ac.fecha_ingreso
                    ORDER BY sv_ultimo.fecha_hora DESC, sv_ultimo.id DESC
                    LIMIT 1
                )

            WHERE ac.fecha_egreso IS NULL

        `;

        const valores: (string | number)[] = [];

        if(buscar && buscar.trim() !== ''){
            sql += `
                AND (
                    p.nombre LIKE ?
                    OR p.apellido LIKE ?
                    OR CONCAT(p.nombre, ' ', p.apellido) LIKE ?
                    OR CAST(c.habitacion AS CHAR) LIKE ?
                )

            `;
            const termino = `%${buscar.trim()}%`;

            valores.push(termino, termino, termino, termino);
        }
        const [filas] =await this.db.query(sql, valores);

        return filas as Omit<PacienteInternado, 'estado'>[];
    }
}
