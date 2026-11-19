export type EstadoHttpEnfermeria = 400 | 404 | 409;

export class ErrorEnfermeria extends Error {
    constructor(
        mensaje: string,
        readonly estado_http: EstadoHttpEnfermeria
    ) {
        super(mensaje);
        this.name = 'ErrorEnfermeria';
    }
}
