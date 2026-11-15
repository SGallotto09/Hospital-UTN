import type { SignoVitalRepository } from "../../domain/repositories/signo_vital_repository.js";

export class ObtenerSignosVitales{
    constructor(
        private readonly signoVitalRepository: SignoVitalRepository
    ){}

    async ejecutar(){
        return this.signoVitalRepository.obtenerTodos();
    }
}

 