
import { Turno } from "../../../domain/entities/Turno";

import type {
    ITurnoRepository
} from "../../../domain/repositories/ITurnoRepository";

import type {
    IPacienteRepository
} from "../../../domain/repositories/IPacienteRepository";


export interface ReservarTurnoDTO {

    idPaciente: number;
    idMedico: number;
    idRecepcionista: number;

    fechaHoraInicio: Date;
    fechaHoraFin: Date;

    costo: number;

}


export class ReservarTurno {

    constructor(
        private readonly turnoRepository: ITurnoRepository,
        private readonly pacienteRepository: IPacienteRepository
    ) {}


    async ejecutar(datos: ReservarTurnoDTO): Promise<Turno> {

        // 1. Comprobar que el paciente exista
        const paciente =
            await this.pacienteRepository.buscarPorId(datos.idPaciente);

        if (!paciente) {
            throw new Error(
                "No se puede reservar el turno: el paciente no existe."
            );
        }


        // 2. Crear la entidad Turno
        const turno = Turno.crear({
            idPaciente: datos.idPaciente,
            idMedico: datos.idMedico,
            idRecepcionista: datos.idRecepcionista,
            fechaHoraInicio: datos.fechaHoraInicio,
            fechaHoraFin: datos.fechaHoraFin,
            costo: datos.costo
        });


        // 3. Solicitar la reserva al repositorio
        // El repositorio controla la disponibilidad y la concurrencia
        return await this.turnoRepository.reservarSiDisponible(turno);

    }
}
