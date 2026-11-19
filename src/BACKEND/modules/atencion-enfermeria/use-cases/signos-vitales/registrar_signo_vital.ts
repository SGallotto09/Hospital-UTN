import type { SignoVitalRepository } from "../../domain/repositories/signo_vital_repository.js";
import type { SignoVital } from "../../domain/entities/signos_vitales.js";
import { ErrorEnfermeria } from "../../domain/errors/error_enfermeria.js";

type DatosSignoVital = Omit<SignoVital, 'id' | 'fecha_hora'>;

export class RegistrarSignoVital {
    constructor(
        private readonly signoVitalRepository: SignoVitalRepository
    ) {}

    async ejecutar(datos: DatosSignoVital) {
        if (!Number.isSafeInteger(datos.id_paciente) || datos.id_paciente <= 0) {
            throw new ErrorEnfermeria("El ID del paciente no es válido", 400);
        }

        if (!Number.isSafeInteger(datos.id_enfermero) || datos.id_enfermero <= 0) {
            throw new ErrorEnfermeria("El ID del enfermero no es válido", 400);
        }

        if (!Number.isFinite(datos.temperatura) || datos.temperatura <= 0) {
            throw new ErrorEnfermeria("La temperatura debe ser mayor a cero", 400);
        }

        if (!Number.isSafeInteger(datos.frecuencia_cardiaca) || datos.frecuencia_cardiaca <= 0) {
            throw new ErrorEnfermeria("La frecuencia cardíaca debe ser un número entero positivo", 400);
        }

        const presion = typeof datos.presion_arterial === 'string'
            ? datos.presion_arterial.match(/^\s*(\d{2,3})\s*\/\s*(\d{2,3})\s*$/)
            : null;
        if (!presion || Number(presion[1]) <= 0 || Number(presion[2]) <= 0) {
            throw new ErrorEnfermeria("La presión arterial debe tener el formato sistólica/diastólica", 400);
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
