import { crearEstadoTurno } from "../states/turno/EstadoTurno.js";
import type { EstadoTurno, EstadoTurnoNombre} from "../states/turno/EstadoTurno.js";

export interface TurnoProps {
    id: number | null;
    idPaciente: number;
    idMedico: number;
    idRecepcionista: number;
    fechaHoraInicio: Date;
    fechaHoraFin: Date;
    estado: EstadoTurnoNombre;
    costo: number;
}

export type NuevoTurnoProps = Omit<
    TurnoProps,
    "id" | "estado"
> & {
    id?: number | null;
};

export class Turno {
    public readonly id: number | null;
    public readonly idPaciente: number;
    public readonly idMedico: number;
    public readonly idRecepcionista: number;
    public readonly costo: number;

    private _fechaHoraInicio: Date;
    private _fechaHoraFin: Date;
    private _estado: EstadoTurno;

    private constructor(props: TurnoProps) {
        this.validarId(props.id, "id");
        this.validarId(props.idPaciente, "idPaciente");
        this.validarId(props.idMedico, "idMedico");
        this.validarId(props.idRecepcionista, "idRecepcionista");

        this.validarFecha(props.fechaHoraInicio);
        this.validarFecha(props.fechaHoraFin);

        if (props.fechaHoraInicio >= props.fechaHoraFin) 
            throw new Error("La fecha de inicio debe ser anterior a la fecha de fin.");
        

        if (!Number.isFinite(props.costo) || props.costo < 0) 
            throw new Error("El costo del turno no es válido.");


        this.id = props.id;
        this.idPaciente = props.idPaciente;
        this.idMedico = props.idMedico;
        this.idRecepcionista = props.idRecepcionista;
        this.costo = props.costo;

        this._fechaHoraInicio = new Date(props.fechaHoraInicio);
        this._fechaHoraFin = new Date(props.fechaHoraFin);

        this._estado = crearEstadoTurno(props.estado);
    }

    static crear(props: NuevoTurnoProps): Turno {
        return new Turno({
            ...props,
            id: props.id ?? null,
            estado: "Programado"
        });
    }

    static reconstituir(props: TurnoProps): Turno {
        return new Turno(props);
    }

    get fechaHoraInicio(): Date {
        return new Date(this._fechaHoraInicio);
    }

    get fechaHoraFin(): Date {
        return new Date(this._fechaHoraFin);
    }

    get estado(): EstadoTurnoNombre {
        return this._estado.nombre;
    }

    get duracionEnMinutos(): number {
        return (
            this._fechaHoraFin.getTime() -
            this._fechaHoraInicio.getTime()
        ) / 60000;
    }

    cambiarEstado(nuevoEstado: EstadoTurnoNombre): void {
        if (!this._estado.permiteTransicionA(nuevoEstado)) 
            throw new Error(`No se puede pasar de ${this.estado} a ${nuevoEstado}.`);

        this._estado = crearEstadoTurno(nuevoEstado);
    }

    ajustarFechaHoraFin(nuevaFechaHoraFin: Date): void {
        this.validarFecha(nuevaFechaHoraFin);

        if (nuevaFechaHoraFin <= this._fechaHoraInicio)
            throw new Error("La fecha de finalización debe ser posterior al inicio.");

        this._fechaHoraFin = new Date(nuevaFechaHoraFin);
    }

    private validarId(valor: number | null, campo: string): void {
        if (valor !== null && (!Number.isSafeInteger(valor) || valor <= 0)) 
            throw new Error(`${campo} debe ser un identificador válido.`);

        if (valor === null && campo !== "id") throw new Error(`${campo} es obligatorio.`);
    }

    private validarFecha(fecha: Date): void {
        if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) 
            throw new Error("La fecha proporcionada no es válida.");
    }
}
