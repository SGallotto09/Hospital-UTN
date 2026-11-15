import type { SignoVitalRepository } from "../../domain/repositories/signo_vital_repository.js";
import type { SignoVital } from "../../domain/entities/signos_vitales.js";

type DatosSignoVital = Omit<SignoVital, 'id' | 'fecha_hora'>;

export class RegistrarSignoVital{
    constructor(
        private readonly signoVitalRepository: SignoVitalRepository
    ){}

    async ejecutar(datos: DatosSignoVital): Promise<SignoVital>{
        if(datos.frecuencia_cardiaca <= 0){
            throw new Error ("La frecuencia cardíaca debe ser mayor a cero");
        }

        if(datos.temperatura <= 0){
            throw new Error("La tempertura debe ser mayor a cero");
        }

        if(!datos.presion_arterial.trim()){
            throw new Error("La presión arterial es obligatoria");
        }
        return this.signoVitalRepository.guardar(datos);
    }
    
}