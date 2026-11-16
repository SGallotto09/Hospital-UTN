
import type { AdministracionMedicacionRepository } from '../../domain/repositories/administracion_medicacion_repository.js';

export class AdministrarMedicacion {

    constructor(
        private readonly administracion_medicacion_repository: AdministracionMedicacionRepository
    ) {}

    async ejecutar(
        id_indicacion_medica: number,
        id_enfermero: number,
        horario_programado: Date,
        cantidad_administrada?: number
    ): Promise<number> {

        if (!Number.isInteger(id_indicacion_medica) || id_indicacion_medica <= 0) {
            throw new Error('El ID de la indicación médica no es válido');
        }

        if (!Number.isInteger(id_enfermero) || id_enfermero <= 0) {
            throw new Error('El ID del enfermero no es válido');
        }

        if (!(horario_programado instanceof Date) || Number.isNaN(horario_programado.getTime())) {
            throw new Error('El horario programado no es válido');
        }

        if (cantidad_administrada !== undefined &&
            (!Number.isSafeInteger(cantidad_administrada) || cantidad_administrada <= 0)) {
            throw new Error('La cantidad administrada debe ser un entero positivo');
        }

        const indicacion = await this.administracion_medicacion_repository.obtenerDatosIndicacion(id_indicacion_medica);

        if (indicacion === null) {
            throw new Error('No se encontró la indicación médica');
        }

        const inicio = new Date(`${indicacion.fecha}T${indicacion.hora_inicio}`);

        const frecuencia = indicacion.frecuencia_horas;

        if (Number.isNaN(inicio.getTime()) || !Number.isInteger(frecuencia) || frecuencia <= 0) {
            throw new Error('Los datos de la indicación no son válidos');
        }

        const intervalo = frecuencia * 60 * 60 * 1000;
        const diferencia = horario_programado.getTime() - inicio.getTime();

        const numero_dosis = Math.round(diferencia / intervalo);

        if (numero_dosis < 0 || Math.abs(diferencia - numero_dosis * intervalo) > 1000) {
            throw new Error(
                'El horario seleccionado no corresponde a una dosis programada'
            );
        }

        const ahora = new Date();

        const diferencia_horario = Math.abs(ahora.getTime() - horario_programado.getTime());

        if (diferencia_horario > 30 * 60 * 1000) {
            throw new Error(
                'La medicación está fuera del horario permitido de ±30 minutos'
            );
        }

        const ya_administrada =
            await this.administracion_medicacion_repository
                .existeDosisAdministrada(
                    id_indicacion_medica,
                    horario_programado
                );

        if (ya_administrada) {
            throw new Error('Esta dosis ya fue administrada');
        }

        return this.administracion_medicacion_repository.administrar(
            id_indicacion_medica,
            id_enfermero,
            ahora,
            horario_programado,
            cantidad_administrada
        );
    }
}
