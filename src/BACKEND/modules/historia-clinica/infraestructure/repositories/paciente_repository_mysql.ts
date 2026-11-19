import { MySQLPacienteRepository } from '../../../admicion-turnos/infraestructure/repositories/MySQLPacienteRepository.js';
import type { Paciente as PacienteAdmision } from '../../../admicion-turnos/domain/entities/Paciente.js';
import type { Paciente } from '../../domain/entities/paciente.js';
import type { PacienteRepository } from '../../domain/repositories/paciente_repository.js';

// Adapta el contrato recuperado sin duplicar consultas de pacientes.
export class PacienteRepositoryMySQL implements PacienteRepository {
    constructor(private readonly pacientes = new MySQLPacienteRepository()) {}
    async obtenerTodos(): Promise<Paciente[]> {
        return (await this.pacientes.listarTodos()).map((paciente) => this.mapear(paciente));
    }
    async obtenerPorId(id: number): Promise<Paciente | null> {
        const paciente = await this.pacientes.buscarPorId(id);
        return paciente ? this.mapear(paciente) : null;
    }
    async obtenerPorDni(dni: string): Promise<Paciente | null> {
        const paciente = await this.pacientes.buscarPorDni(dni);
        return paciente ? this.mapear(paciente) : null;
    }
    private mapear(paciente: PacienteAdmision): Paciente {
        if (paciente.id === null) throw new Error('Paciente sin identificador persistido.');
        return {
            id: paciente.id,
            nombre: paciente.nombre,
            apellido: paciente.apellido,
            dni: paciente.dni,
            fecha_nacimiento: new Date(paciente.fechaNacimiento + 'T00:00:00'),
            genero: paciente.genero,
            telefono: paciente.telefono,
            email: paciente.email,
            obra_social: paciente.obraSocial,
        };
    }
}
