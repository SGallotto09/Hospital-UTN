export interface VerificadorContrasenia {
    verificar(
        contrasenia: string,
        hash: string
    ): Promise<boolean>;
}