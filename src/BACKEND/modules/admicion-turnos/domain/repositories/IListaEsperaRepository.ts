import type { ListaEspera } from "../entities/ListaEspera.js";

export interface IListaEsperaRepository {

    // Registrar un paciente en la lista de espera
    guardar(
        listaEspera: ListaEspera
    ): Promise<ListaEspera>;


    // Comprobar si un paciente ya tiene una solicitud pendiente
    buscarPendientePorPaciente(
        idPaciente: number,
        idMedico: number,
        fechaSolicitada: string
    ): Promise<ListaEspera | null>;


    // Recuperar al primer paciente de la cola FIFO
    buscarPrimeroEnEspera(
        idMedico: number,
        fechaSolicitada: string
    ): Promise<ListaEspera | null>;


    // Actualizar el estado de una solicitud
    actualizar(
        listaEspera: ListaEspera
    ): Promise<void>;

}
