import type { PacienteInternadoRepository } from "../../domain/repositories/paciente_internado_repository.js";

export class ObtenerPacientesInternados {
    constructor(
        private readonly pacienteInternadoRepository: PacienteInternadoRepository
    ) {}

    async ejecutar(buscar?: string) {
        const pacientes = await this.pacienteInternadoRepository.obtenerInternados(buscar);

        return pacientes.map(paciente => {
            if(paciente.presion_arterial === null || paciente.frecuencia_cardiaca === null || paciente.temperatura === null){
                return {
                    ...paciente,
                    estado: 'Sin registros' as const
                };
            }
            const requiereAtencion = Number(paciente.temperatura) > 39;

            return{
                ...paciente,
                estado: requiereAtencion ? 'Requiere atención' as const : 'Estable' as const
            };
        });
    }
}