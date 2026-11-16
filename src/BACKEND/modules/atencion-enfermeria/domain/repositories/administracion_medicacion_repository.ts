
import type { IndicacionMedicacion } from '../entities/indicacion_medicacion.js';

export interface AdministracionMedicacionRepository {
    obtenerTodas(): Promise<IndicacionMedicacion[]>;

    administrar(
        id_indicacion_medica: number,
        id_enfermero: number,
        fecha_hora: Date,
        horario_programado: Date,
        cantidad_administrada?: number
    ): Promise<number>;

    obtenerDatosIndicacion(
        id_indicacion_medica: number
    ): Promise<{
        fecha: string;
        hora_inicio: string;
        frecuencia_horas: number;
    } | null>;

    existeDosisAdministrada(
        id_indicacion_medica: number,
        horario_programado: Date
    ): Promise<boolean>;
}
