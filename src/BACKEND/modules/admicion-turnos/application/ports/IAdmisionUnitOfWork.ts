import type {
    ITurnoRepository
} from "../../domain/repositories/ITurnoRepository.js";

import type {
    IListaEsperaRepository
} from "../../domain/repositories/IListaEsperaRepository.js";


export interface RepositoriosAdmisionTransaccionales {

    // Repositorio de turnos
    turnos: ITurnoRepository;

    // Repositorio de lista de espera
    listaEspera: IListaEsperaRepository;

    // Bloquear la fila del médico durante la transacción
    bloquearMedico(idMedico: number): Promise<void>;

}


export interface IAdmisionUnitOfWork {

    // Ejecutar un conjunto de operaciones
    // dentro de una misma transacción
    ejecutar<T>(
        operacion: (
            repositorios: RepositoriosAdmisionTransaccionales
        ) => Promise<T>
    ): Promise<T>;

}
