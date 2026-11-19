import type { Alergia } from '../entities/alergia.js';

export type DatosNuevaAlergia = Omit<Alergia, 'id' | 'fecha_registro'>;
export type VersionAlergia = Alergia & {
    fecha_deteccion_calendario: string;
    id_alergia_anterior: number | null;
    id_alergia_nueva: number | null;
    motivo: string | null;
};

export interface AlergiaRepository {
    guardar(datos: DatosNuevaAlergia): Promise<Alergia>;

    obtenerPorPaciente(idPaciente: number): Promise<Alergia[]>;
    rectificar(
        idAnterior: number,
        datos: DatosNuevaAlergia,
        motivo: string,
    ): Promise<Alergia | 'inexistente' | 'reemplazada'>;
    obtenerVersionesPorPaciente(idPaciente: number): Promise<VersionAlergia[]>;
}
