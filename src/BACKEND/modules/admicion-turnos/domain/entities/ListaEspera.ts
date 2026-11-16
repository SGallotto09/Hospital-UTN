export type EstadoListaEspera =
    | "EN_ESPERA"
    | "ASIGNADO"
    | "RETIRADO";


export interface ListaEsperaProps {

    id: number | null;
    idPaciente: number;
    idMedico: number;
    fechaSolicitada: string;
    fechaHoraIngreso: Date;
    estado: EstadoListaEspera;

}


export type NuevaListaEsperaProps = Omit<
    ListaEsperaProps,
    "id" | "fechaHoraIngreso" | "estado"
> & {
    id?: number | null;
    fechaHoraIngreso?: Date;
};


export class ListaEspera {

    public readonly id: number | null;
    public readonly idPaciente: number;
    public readonly idMedico: number;
    public readonly fechaSolicitada: string;

    private readonly _fechaHoraIngreso: Date;
    private _estado: EstadoListaEspera;


    private constructor(props: ListaEsperaProps) {

        this.validarId(props.id, "id");
        this.validarId(props.idPaciente, "idPaciente");
        this.validarId(props.idMedico, "idMedico");

        this.validarFecha(props.fechaSolicitada);
        this.validarFechaHora(props.fechaHoraIngreso);
        this.validarEstado(props.estado);

        this.id = props.id;
        this.idPaciente = props.idPaciente;
        this.idMedico = props.idMedico;
        this.fechaSolicitada = props.fechaSolicitada;

        this._fechaHoraIngreso = new Date(props.fechaHoraIngreso);
        this._estado = props.estado;

    }


    // Crear una nueva solicitud
    static crear(props: NuevaListaEsperaProps): ListaEspera {

        return new ListaEspera({

            ...props,

            id: props.id ?? null,

            fechaHoraIngreso: props.fechaHoraIngreso ?? new Date(),

            estado: "EN_ESPERA"

        });

    }


    // Reconstruir una solicitud recuperada de MySQL
    static reconstituir(props: ListaEsperaProps): ListaEspera {

        return new ListaEspera(props);

    }


    get fechaHoraIngreso(): Date {

        return new Date(this._fechaHoraIngreso);

    }


    get estado(): EstadoListaEspera {

        return this._estado;

    }


    // Marcar la solicitud como asignada
    marcarComoAsignado(): void {

        if (this._estado !== "EN_ESPERA") {

            throw new Error(
                "Solo se puede asignar un paciente que esté en espera."
            );

        }

        this._estado = "ASIGNADO";

    }


    // Retirar al paciente de la lista de espera
    retirar(): void {

        if (this._estado !== "EN_ESPERA") {

            throw new Error(
                "Solo se puede retirar un paciente que esté en espera."
            );

        }

        this._estado = "RETIRADO";

    }


    private validarId(
        id: number | null,
        campo: string
    ): void {

        if (
            id !== null &&
            (!Number.isSafeInteger(id) || id <= 0)
        ) {

            throw new Error(
                `El identificador ${campo} no es válido.`
            );

        }

        if (id === null && campo !== "id") {

            throw new Error(
                `El campo ${campo} es obligatorio.`
            );

        }

    }


    private validarFecha(fecha: string): void {

        const formatoFecha = /^\d{4}-\d{2}-\d{2}$/;

        if (!formatoFecha.test(fecha)) {

            throw new Error(
                "La fecha solicitada debe tener el formato YYYY-MM-DD."
            );

        }

        const partes = fecha.split("-");

        const anio = Number(partes[0]);
        const mes = Number(partes[1]);
        const dia = Number(partes[2]);

        const fechaValidada = new Date(anio, mes - 1, dia);

        if (
            fechaValidada.getFullYear() !== anio ||
            fechaValidada.getMonth() !== mes - 1 ||
            fechaValidada.getDate() !== dia
        ) {

            throw new Error(
                "La fecha solicitada no es válida."
            );

        }

    }


    private validarFechaHora(fecha: Date): void {

        if (
            !(fecha instanceof Date) ||
            Number.isNaN(fecha.getTime())
        ) {

            throw new Error(
                "La fecha y hora de ingreso no son válidas."
            );

        }

    }


    private validarEstado(estado: EstadoListaEspera): void {

        const estadosValidos: EstadoListaEspera[] = [
            "EN_ESPERA",
            "ASIGNADO",
            "RETIRADO"
        ];

        if (!estadosValidos.includes(estado)) {

            throw new Error(
                "El estado de la solicitud no es válido."
            );

        }

    }

}
