
import type { Triaje, EstadoTriaje } from "../entities/Triaje.js";

export interface ITriajeRepository {

    // Buscar un registro de triaje por su identificador
    buscarPorId(id: number): Promise<Triaje | null>;

    // Registrar una nueva evaluación de triaje
    guardar(triaje: Triaje): Promise<Triaje>;

    // Actualizar el estado de un triaje
    actualizar(triaje: Triaje): Promise<void>;

    // Obtener los registros según su estado
    listarPorEstado(estado: EstadoTriaje): Promise<Triaje[]>;
}
