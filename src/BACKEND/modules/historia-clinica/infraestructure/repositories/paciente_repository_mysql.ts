import { Database } from '../../../../database/connectionDB.js';

import type { PacienteRepository } from '../../domain/repositories/paciente_repository.js';
import type { Paciente } from '../../domain/entities/paciente.js';

export class PacienteRepositoryMySQL implements PacienteRepository {
    private readonly db = Database.getInstance();

    async obtenerTodos(): Promise<Paciente[]> {
        const [filas] = await this.db.query(
            'SELECT * FROM pacientes'
        );

        return filas as Paciente[];
    }

    async obtenerPorId(id: number): Promise<Paciente | null> {
        const [filas] = await this.db.query(
            'SELECT * FROM pacientes WHERE id = ?',
            [id]
        );

        const pacientes = filas as Paciente[];

        return pacientes.length > 0 ? pacientes[0]! : null;
    }

    async obtenerPorDni(dni: string): Promise<Paciente | null> {
        const [filas] = await this.db.query(
            'SELECT * FROM pacientes WHERE dni = ? LIMIT 1',
            [dni]
        );

        const pacientes = filas as Paciente[];

        return pacientes.length > 0 ? pacientes[0]! : null;
    }
}
