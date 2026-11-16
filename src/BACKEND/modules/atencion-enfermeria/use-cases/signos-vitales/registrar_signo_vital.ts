import type { SignoVitalRepository } from "../../domain/repositories/signo_vital_repository.js";
import type { SignoVital } from "../../domain/entities/signos_vitales.js";

type DatosSignoVital = Omit<SignoVital, 'id' | 'fecha_hora'>;

export class RegistrarSignoVital {
    constructor(
        private readonly signoVitalRepository: SignoVitalRepository
    ) {}

    async ejecutar(datos: DatosSignoVital) {
        if (!Number.isInteger(datos.id_paciente) || datos.id_paciente <= 0) {
            throw new Error("El ID del paciente no es válido");
        }

        if (!Number.isInteger(datos.id_enfermero) || datos.id_enfermero <= 0) {
            throw new Error("El ID del enfermero no es válido");
        }

        if (!Number.isFinite(datos.frecuencia_cardiaca) || datos.frecuencia_cardiaca <= 0) {
            throw new Error("La frecuencia cardíaca debe ser mayor a cero");
        }

        if (!Number.isFinite(datos.temperatura) || datos.temperatura <= 0) {
            throw new Error("La temperatura debe ser mayor a cero");
        }

        if (typeof datos.presion_arterial !== "string" || !datos.presion_arterial.trim()) {
            throw new Error("La presión arterial es obligatoria");
        }

        const signoVital = await this.signoVitalRepository.guardar(datos);

        const alerta = datos.temperatura > 39;

        return {
            signoVital,
            alerta,
            prioridad: alerta ? "Alta" : null,
            mensaje: alerta
                ? "Temperatura superior a 39 °C. Requiere atención médica."
                : null
        };
    }
}