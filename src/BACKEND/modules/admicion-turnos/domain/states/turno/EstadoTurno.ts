
export type EstadoTurnoNombre =
    | "Programado"
    | "Confirmado"
    | "En Sala de Espera"
    | "Atendido"
    | "Cancelado";

export interface EstadoTurno {
    readonly nombre: EstadoTurnoNombre;

    permiteTransicionA(
        siguienteEstado: EstadoTurnoNombre
    ): boolean;
}

abstract class EstadoBase implements EstadoTurno {

    constructor(
        public readonly nombre: EstadoTurnoNombre,
        private readonly transicionesPermitidas: EstadoTurnoNombre[]
    ) {}

    permiteTransicionA(
        siguienteEstado: EstadoTurnoNombre
    ): boolean {
        return this.transicionesPermitidas.includes(siguienteEstado);
    }
}

class EstadoProgramado extends EstadoBase {
    constructor() {
        super("Programado", ["Confirmado", "Cancelado"]);
    }
}

class EstadoConfirmado extends EstadoBase {
    constructor() {
        super("Confirmado", ["En Sala de Espera", "Cancelado"]);
    }
}

class EstadoEnSalaDeEspera extends EstadoBase {
    constructor() {
        super("En Sala de Espera", ["Atendido", "Cancelado"]);
    }
}

class EstadoAtendido extends EstadoBase {
    constructor() {
        super("Atendido", []);
    }
}

class EstadoCancelado extends EstadoBase {
    constructor() {
        super("Cancelado", []);
    }
}

export function crearEstadoTurno(
    estado: EstadoTurnoNombre
): EstadoTurno {

    switch (estado) {
        case "Programado":
            return new EstadoProgramado();

        case "Confirmado":
            return new EstadoConfirmado();

        case "En Sala de Espera":
            return new EstadoEnSalaDeEspera();

        case "Atendido":
            return new EstadoAtendido();

        case "Cancelado":
            return new EstadoCancelado();

        default:
            throw new Error(`Estado de turno desconocido: ${estado}`);
    }
}
