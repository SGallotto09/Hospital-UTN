
import { Turno } from "../entities/Turno";

export interface ITurnoRepository {

    buscarPorId(id: number): Promise<Turno | null>;

    listarPorMedicoEnRango(
        idMedico: number,
        fechaInicio: Date,
        fechaFin: Date
    ): Promise<Turno[]>;

    crearSiDisponible(turno: Turno): Promise<Turno>;

    actualizar(turno: Turno): Promise<void>;

    insertarEntreturno(
        turnoOriginal: Turno,
        nuevoTurno: Turno
    ): Promise<void>;
}
