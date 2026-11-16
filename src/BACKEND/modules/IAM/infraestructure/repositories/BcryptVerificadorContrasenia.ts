import bcrypt from "bcrypt";
import type { VerificadorContrasenia } from "../../domain/repositories/VerificadorContrasenia.js";

export class BcryptVerificadorContrasenia implements VerificadorContrasenia {

    async verificar(
        contrasenia: string,
        hash: string
    ): Promise<boolean> {

        return await bcrypt.compare(contrasenia, hash);
    }
}