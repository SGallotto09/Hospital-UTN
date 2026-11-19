import type {
    ListaEspera,
    EstadoListaEspera
} from "../entities/ListaEspera.js";

export interface IListaEsperaRepository {

    buscarPorId(
        id: number
    ): Promise<ListaEspera | null>;

    buscarPendientePorPaciente(
        idPaciente: number,
        idMedico: number,
        fechaSolicitada: string
    ): Promise<ListaEspera | null>;

    buscarPrimeroEnEspera(
        idMedico: number,
        fechaSolicitada: string
    ): Promise<ListaEspera | null>;

    listarTodos(
        estado?: EstadoListaEspera
    ): Promise<ListaEspera[]>;

    guardar(
        solicitud: ListaEspera
    ): Promise<ListaEspera>;

    actualizar(
        solicitud: ListaEspera
    ): Promise<void>;

}