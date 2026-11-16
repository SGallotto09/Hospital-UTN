
import type {
    Triaje
} from "../../../domain/entities/Triaje.js";

import {
    obtenerEstrategiaPrioridad
} from "../../../domain/strategies/triaje/EstrategiaPrioridadFactory.js";

import type {
    ITriajeRepository
} from "../../../domain/repositories/ITriajeRepository.js";


export class PriorizarColaTriaje {

    constructor(
        private readonly triajeRepository: ITriajeRepository
    ) {}


    async ejecutar(): Promise<Triaje[]> {

        // 1. Obtener los pacientes que están esperando
        const triajes = await this.triajeRepository.listarPorEstado(
            "EN_ESPERA"
        );


        // 2. Ordenar según la prioridad de cada paciente
        const colaOrdenada = [...triajes].sort((a, b) => {

            const estrategiaA = obtenerEstrategiaPrioridad(
                a.nivelUrgencia
            );

            const estrategiaB = obtenerEstrategiaPrioridad(
                b.nivelUrgencia
            );


            const prioridadA = estrategiaA.obtenerPrioridad();
            const prioridadB = estrategiaB.obtenerPrioridad();


            // Primero se ordenan por nivel de urgencia
            if (prioridadA !== prioridadB) {
                return prioridadA - prioridadB;
            }


            // Si tienen la misma prioridad,
            // se respeta el orden de llegada
            return (
                a.fechaHoraIngreso.getTime() -
                b.fechaHoraIngreso.getTime()
            );

        });


        return colaOrdenada;

    }

}
