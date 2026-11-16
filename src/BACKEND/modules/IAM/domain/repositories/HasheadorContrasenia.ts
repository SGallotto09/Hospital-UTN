export interface HasheadorContrasenia {
    hashear(contrasenia: string): Promise<string>;
}