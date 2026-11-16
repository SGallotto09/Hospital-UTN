
export type NivelUrgencia =
    | "ROJO"
    | "AMARILLO"
    | "VERDE";

export type EstadoTriaje =
    | "EN_ESPERA"
    | "EN_ATENCION"
    | "ATENDIDO";

export interface TriajeProps {
    id: number | null;
    idPaciente: number;
    idEnfermero: number;
    nivelUrgencia: NivelUrgencia;
    observaciones: string | null;
    fechaHoraIngreso: Date;
    estado: EstadoTriaje;
}

export type NuevoTriajeProps = Pick<
    TriajeProps,
    "idPaciente" | "idEnfermero" | "nivelUrgencia"
> & {
    id?: number | null;
    observaciones?: string | null;
    fechaHoraIngreso?: Date;
};

export class Triaje {

    public readonly id: number | null;
    public readonly idPaciente: number;
    public readonly idEnfermero: number;
    public readonly nivelUrgencia: NivelUrgencia;
    public readonly observaciones: string | null;

    private readonly _fechaHoraIngreso: Date;
    private _estado: EstadoTriaje;

    private constructor(props: TriajeProps) {

        this.validarId(props.id, "id", true);
        this.validarId(props.idPaciente, "idPaciente");
        this.validarId(props.idEnfermero, "idEnfermero");

        this.validarNivelUrgencia(props.nivelUrgencia);
        this.validarObservaciones(props.observaciones);
        this.validarFecha(props.fechaHoraIngreso);

        this.id = props.id;
        this.idPaciente = props.idPaciente;
        this.idEnfermero = props.idEnfermero;
        this.nivelUrgencia = props.nivelUrgencia;
        this.observaciones = props.observaciones?.trim() || null;

        this._fechaHoraIngreso = new Date(props.fechaHoraIngreso);
        this._estado = props.estado;
    }

    static crear(props: NuevoTriajeProps): Triaje {

        return new Triaje({
            ...props,
            id: props.id ?? null,
            observaciones: props.observaciones ?? null,
            fechaHoraIngreso: props.fechaHoraIngreso ?? new Date(),
            estado: "EN_ESPERA"
        });
    }

    static reconstituir(props: TriajeProps): Triaje {
        if (
            !Number.isSafeInteger(props.id) ||
            props.id === null ||
            props.id <= 0
        ) {
            throw new Error("No se puede reconstruir un triaje sin un ID válido.");
        }

        return new Triaje(props);
    }

    get fechaHoraIngreso(): Date {
        return new Date(this._fechaHoraIngreso);
    }

    get estado(): EstadoTriaje {
        return this._estado;
    }

    get esRiesgoVital(): boolean {
        return this.nivelUrgencia === "ROJO";
    }

    iniciarAtencion(): void {

        if (this._estado !== "EN_ESPERA") {
            throw new Error(
                "Solo se puede iniciar la atención de un paciente en espera."
            );
        }

        this._estado = "EN_ATENCION";
    }

    finalizarAtencion(): void {

        if (this._estado !== "EN_ATENCION") {
            throw new Error(
                "El paciente debe estar en atención para finalizar el triaje."
            );
        }

        this._estado = "ATENDIDO";
    }

    private validarId(
        id: number | null,
        campo: string,
        permitirNull: boolean = false
    ): void {

        if (id === null && permitirNull) {
            return;
        }

        if (
            id === null ||
            !Number.isSafeInteger(id) ||
            id <= 0
        ) {
            throw new Error(
                `El campo ${campo} debe ser un ID válido.`
            );
        }
    }

    private validarNivelUrgencia(nivel: NivelUrgencia): void {

        const nivelesValidos: NivelUrgencia[] = [
            "ROJO",
            "AMARILLO",
            "VERDE"
        ];

        if (!nivelesValidos.includes(nivel)) {
            throw new Error("El nivel de urgencia no es válido.");
        }
    }

    
    private validarObservaciones(observaciones: string | null): void {

        if (
            observaciones !== null &&
            observaciones.trim().length > 45
        ) {
            throw new Error(
                "Las observaciones no pueden superar los 45 caracteres."
            );
        }
        
    }


    private validarFecha(fecha: Date): void {

        if (
            !(fecha instanceof Date) ||
            Number.isNaN(fecha.getTime())
        ) {
            throw new Error("La fecha de ingreso no es válida.");
        }
    }
}
