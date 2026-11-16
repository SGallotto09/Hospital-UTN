import type { Turno } from "../../../domain/entities/Turno.js";
import type { ITurnoRepository } from "../../../domain/repositories/ITurnoRepository.js";

export interface ConsultarAgendaMedicaDTO {
    idMedico: number;
    fecha: string;
}

export class ConsultarAgendaMedica {
    constructor(
        private readonly turnoRepository: ITurnoRepository
    ) {}

    async ejecutar(datos: ConsultarAgendaMedicaDTO): Promise<Turno[]> {

        // 1. Validar el identificador del médico
        if (!Number.isSafeInteger(datos.idMedico) || datos.idMedico <= 0) {
            throw new Error("El identificador del médico no es válido.");
        }

        // 2. Validar el formato de la fecha
        const formatoFecha = /^\d{4}-\d{2}-\d{2}$/;

        if (!formatoFecha.test(datos.fecha)) {
            throw new Error("La fecha debe tener el formato YYYY-MM-DD.");
        }

        // 3. Obtener año, mes y día
        const partes = datos.fecha.split("-");

        const anio = Number(partes[0]);
        const mes = Number(partes[1]);
        const dia = Number(partes[2]);

        // 4. Comprobar que la fecha exista
        const fechaValidada = new Date(anio, mes - 1, dia);

        if (
            fechaValidada.getFullYear() !== anio ||
            fechaValidada.getMonth() !== mes - 1 ||
            fechaValidada.getDate() !== dia
        ) throw new Error("La fecha ingresada no es válida.");
        
        // 5. Definir el inicio y el final del día
        const fechaInicio = new Date(anio, mes - 1, dia, 0, 0, 0, 0);

        const fechaFin = new Date(anio, mes - 1, dia + 1, 0, 0, 0, 0);

        // 6. Consultar los turnos del médico
        const turnos = await this.turnoRepository.listarPorMedicoEnRango(
            datos.idMedico,
            fechaInicio,
            fechaFin
        );

        // 7. Ordenar los turnos cronológicamente
        return [...turnos].sort(
            (a, b) =>
                a.fechaHoraInicio.getTime() -
                b.fechaHoraInicio.getTime()
        );
    }
}
