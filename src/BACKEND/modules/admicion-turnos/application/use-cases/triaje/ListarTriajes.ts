
import type { Triaje } from "../../../domain/entities/Triaje.js";
import type { ITriajeRepository } from "../../../domain/repositories/ITriajeRepository.js";

export class ListarTriajes {
    constructor(
        private readonly repository: ITriajeRepository
    ) {}

    async ejecutar(): Promise<Triaje[]> {
        const estados = [
            "EN_ESPERA",
            "EN_ATENCION",
            "ATENDIDO"
        ] as const;

        const resultados = await Promise.all(
            estados.map((estado) =>
                this.repository.listarPorEstado(estado)
            )
        );

        const prioridad = {
            ROJO: 1,
            AMARILLO: 2,
            VERDE: 3
        };

        return resultados
            .flat()
            .sort((a, b) => {
                const diferencia =
                    prioridad[a.nivelUrgencia] -
                    prioridad[b.nivelUrgencia];

                if (diferencia !== 0) return diferencia;

                return (
                    a.fechaHoraIngreso.getTime() -
                    b.fechaHoraIngreso.getTime()
                );
            });
    }
}
