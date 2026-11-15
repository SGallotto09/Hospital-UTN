export class Usuario {
    constructor(
        public id: number,
        public nombre: string,
        public apellido: string,
        public dni: string,
        public email: string,
        public usuario: string,
        public contrasenia: string,
        public rol: string
    ) {}
}