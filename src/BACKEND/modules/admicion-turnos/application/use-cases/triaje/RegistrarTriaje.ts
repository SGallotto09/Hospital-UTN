
import { Triaje } from "../../../domain/entities/Triaje.js";

import type {
    NivelUrgencia
} from "../../../domain/entities/Triaje.js";

import type {
    ITriajeRepository
} from "../../../domain/repositories/ITriajeRepository.js";

import type {
    IPacienteRepository
} from "../../../domain/repositories/IPacienteRepository.js";

import type {
    INotificacionService
} from "../../ports/INotificacionService.js";


export interface RegistrarTriajeDTO {

    idPaciente: number;

    // Debe obtenerse del usuario enfermero autenticado
    idEnfermero: number;

    nivelUrgencia: NivelUrgencia;

    observaciones?: string | null;

}


export class RegistrarTriaje {

    constructor(
        private readonly triajeRepository: ITriajeRepository,
        private readonly pacienteRepository: IPacienteRepository,
        private readonly notificacionService: INotificacionService
    ) {}


    async ejecutar(
        datos: RegistrarTriajeDTO
    ): Promise<Triaje> {

        // 1. Verificar que el paciente exista
        const paciente =
            await this.pacienteRepository.buscarPorId(
                datos.idPaciente
            );

        if (!paciente) {

            throw new Error(
                "No se puede registrar el triaje: el paciente no existe."
            );

        }


        // 2. Crear la entidad Triaje
        // El estado inicial será EN_ESPERA
        const triaje = Triaje.crear({

            idPaciente: datos.idPaciente,

            idEnfermero: datos.idEnfermero,

            nivelUrgencia: datos.nivelUrgencia,

            observaciones: datos.observaciones ?? null

        });


        // 3. Guardar el triaje en MySQL
        const triajeRegistrado =
            await this.triajeRepository.guardar(triaje);


        // 4. Comprobar si es un paciente de riesgo vital
        if (
            triajeRegistrado.esRiesgoVital &&
            triajeRegistrado.id !== null
        ) {

            // 5. Emitir una alerta a los médicos de guardia
            this.notificacionService.notificarUrgenciaVital({

                idTriaje: triajeRegistrado.id,

                idPaciente: triajeRegistrado.idPaciente,

                idEnfermero: triajeRegistrado.idEnfermero,

                nivelUrgencia: "ROJO",

                fechaHoraIngreso:
                    triajeRegistrado.fechaHoraIngreso.toISOString()

            });

        }


        // 6. Devolver el triaje registrado
        return triajeRegistrado;

    }

}
