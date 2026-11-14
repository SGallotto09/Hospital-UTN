import type { SignoVitalRepository } from "../domain/repositories/signo_vital_repository";

export class obtenerSignosVitales{
    constructor(
        private readonly signoVitalRepository: SignoVitalRepository
    ){}

    async ejecutar(){
        return this.signoVitalRepository.obtenerTodos();
    }
}

 