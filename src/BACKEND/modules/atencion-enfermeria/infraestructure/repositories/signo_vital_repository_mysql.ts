import { Database } from '../../../../database/connectionDB.js';
import type { SignoVitalRepository } from '../../domain/repositories/signo_vital_repository.js';
import type { SignoVital } from '../../domain/entities/signos_vitales.js';

export class SignoVitalRepositoryMySQL implements SignoVitalRepository{
    private readonly db = Database.getInstance();

    async guardar(datos: Omit<SignoVital, 'id' | 'fecha_hora'>): Promise<SignoVital>{
        const resultado = await this.db.query(
            `INSERT INTO signos_vitales
                (id_paciente, id_enfermero, presion_arterial, frecuencia_cardiaca, temperatura)
            VALUES (?, ?, ?, ?, ?)`,

            [
                datos.id_paciente,
                datos.id_enfermero,
                datos.presion_arterial,
                datos.frecuencia_cardiaca,
                datos.temperatura,
            ]
        );
        const [insertResult] = resultado;
        const id = (insertResult as {insertId: number}).insertId;

        const [filas] = await this.db.query(
            'SELECT * FROM signos_vitales WHERE id = ?',
            [id]
        );
        return (filas as SignoVital[])[0];
    }
    async obtenerPorPaciente(idPaciente: number): Promise<SignoVital[]> {
        const [filas] = await this.db.query(
            'SELECT * FROM signos_vitales WHERE id_paciente = ? ORDER BY fecha_hora DESC',
            [idPaciente]
        );
        return filas as SignoVital[];
    }
    async obtenerTodos(): Promise<SignoVital[]> {
        const [filas] = await this.db.query(
            'SELECT * FROM signos_vitales ORDER BY fecha_hora DESC'
        );
        return filas as SignoVital[];
    }
    
}