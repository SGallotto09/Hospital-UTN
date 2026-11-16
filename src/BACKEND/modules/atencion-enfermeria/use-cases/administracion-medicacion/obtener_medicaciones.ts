
import type { AdministracionMedicacionRepository } from '../../domain/repositories/administracion_medicacion_repository.js';
import type { DosisProgramada } from '../../domain/entities/dosis_programada.js';

export class ObtenerMedicaciones {

    constructor(
        private readonly administracionMedicacionRepository: AdministracionMedicacionRepository
    ) {}

    async ejecutar(): Promise<DosisProgramada[]> {

        const indicaciones = await this.administracionMedicacionRepository.obtenerTodas();

        const dosisProgramadas: DosisProgramada[] = [];

        const ahora = new Date();

        for (const indicacion of indicaciones) {

            const inicio = new Date(
                `${indicacion.fecha}T${indicacion.hora_inicio}`
            );

            if (
                Number.isNaN(inicio.getTime()) ||
                indicacion.frecuencia_horas <= 0
            ) {
                continue;
            }

            const intervalo = indicacion.frecuencia_horas * 60 * 60 * 1000;

            let horario = new Date(inicio);

            while (horario <= ahora) {

                const administrada = await this.administracionMedicacionRepository.existeDosisAdministrada(
                            indicacion.id_indicacion_medica,
                            horario
                        );

                dosisProgramadas.push({
                    id_indicacion_medica: indicacion.id_indicacion_medica,
                    id_paciente: indicacion.id_paciente,
                    nombre: indicacion.nombre,
                    apellido: indicacion.apellido,
                    habitacion: indicacion.habitacion,
                    medicamento: indicacion.medicamento,
                    cantidad: indicacion.cantidad,
                    horario_programado: new Date(horario),
                    estado: administrada ? 'Administrada' : 'Pendiente'
                });

                horario = new Date(horario.getTime() + intervalo);
            }
        }

        return dosisProgramadas;
    }
}
