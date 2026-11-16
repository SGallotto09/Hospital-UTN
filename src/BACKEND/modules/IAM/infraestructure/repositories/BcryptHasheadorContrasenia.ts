import bcrypt from "bcrypt";
import type { HasheadorContrasenia } from "../../domain/repositories/HasheadorContrasenia.js";

export class BcryptHasheadorContrasenia implements HasheadorContrasenia {
    async hashear(contrasenia: string): Promise<string> {
        return await bcrypt.hash(contrasenia, 10);
    }
}