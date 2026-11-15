
import type { Turno } from "../entities/Turno.js";

export interface ITurnoRepository {

    // Buscar un turno por su identificador
    buscarPorId(id: number): Promise<Turno | null>;

    // Consultar los turnos de un médico dentro de un período
    listarPorMedicoEnRango(
        idMedico: number,
        fechaInicio: Date,
        fechaFin: Date
    ): Promise<Turno[]>;

    // Reservar un turno verificando que el horario esté disponible
    reservarSiDisponible(turno: Turno): Promise<Turno>;

    // Actualizar un turno existente
    actualizar(turno: Turno): Promise<void>;

    // Modificar el turno original e insertar un entreturno
    insertarEntreturno(
        turnoOriginal: Turno,
        nuevoTurno: Turno
    ): Promise<void>;
}
