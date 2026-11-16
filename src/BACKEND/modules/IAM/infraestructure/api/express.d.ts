import type { VerificadorToken } from "../../domain/repositories/VerificadorToken.js";

declare global {
    namespace Express {
        interface Request {
            usuario?: ReturnType<VerificadorToken["verificar"]>;
        }
    }
}

export {};