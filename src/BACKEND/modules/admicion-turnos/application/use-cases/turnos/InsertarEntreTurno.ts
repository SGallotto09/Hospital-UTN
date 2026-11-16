import { Turno } from "../../../domain/entities/Turno.js";
import type { ITurnoRepository } from "../../../domain/repositories/ITurnoRepository.js";
import type { IPacienteRepository } from "../../../domain/repositories/IPacienteRepository.js";

export interface InsertarEntreturnoDTO {
    idTurnoOriginal: number;
    idPaciente: number;
    idRecepcionista: number;
    fechaHoraInicio: Date;
    costo: number;
}

export class InsertarEntreturno {
    constructor(
        private readonly turnoRepository: ITurnoRepository,
        private readonly pacienteRepository: IPacienteRepository
    ) {}

    async ejecutar(datos: InsertarEntreturnoDTO): Promise<Turno> {

        // 1. Validar el identificador del turno original
        if (!Number.isSafeInteger(datos.idTurnoOriginal) || datos.idTurnoOriginal <= 0) {
            throw new Error("El identificador del turno original no es válido.");
        }

        // 2. Buscar el turno que vamos a modificar
        const turnoOriginal = await this.turnoRepository.buscarPorId(datos.idTurnoOriginal);

        if (!turnoOriginal) throw new Error("No se encontró el turno original.");

        // 3. Comprobar que el turno pueda modificarse
        if (turnoOriginal.estado !== "Programado" && turnoOriginal.estado !== "Confirmado") {
            throw new Error(
                "Solo se pueden insertar entreturnos sobre turnos programados o confirmados."
            );
        }

        // 4. Comprobar que el nuevo paciente exista
        const paciente = await this.pacienteRepository.buscarPorId(datos.idPaciente);

        if (!paciente) throw new Error("No se puede insertar el entreturno: el paciente no existe.");

        // 5. Guardar la fecha de finalización original
        const fechaHoraFinOriginal = turnoOriginal.fechaHoraFin;

        // 6. Verificar que el inicio del entreturno
        // esté dentro del intervalo del turno original
        if (datos.fechaHoraInicio <= turnoOriginal.fechaHoraInicio || datos.fechaHoraInicio >= fechaHoraFinOriginal) {
            throw new Error("El entreturno debe comenzar dentro del horario del turno original.");
        }

        // 7. Crear el nuevo turno
        const nuevoTurno = Turno.crear({
            idPaciente: datos.idPaciente,
            idMedico: turnoOriginal.idMedico,
            idRecepcionista: datos.idRecepcionista,
            fechaHoraInicio: datos.fechaHoraInicio,
            fechaHoraFin: fechaHoraFinOriginal,
            costo: datos.costo
        });

        // 8. Reducir la duración del turno original
        turnoOriginal.ajustarFechaHoraFin(datos.fechaHoraInicio);

        // 9. Actualizar el turno original e insertar el nuevo
        // Ambas operaciones deben ejecutarse en una
        // única transacción en MySQL
        return await this.turnoRepository.insertarEntreturno(turnoOriginal, nuevoTurno);
    }
}
