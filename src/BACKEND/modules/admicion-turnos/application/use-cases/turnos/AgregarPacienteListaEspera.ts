import { ListaEspera } from "../../../domain/entities/ListaEspera.js";

import type {
    IListaEsperaRepository
} from "../../../domain/repositories/IListaEsperaRepository.js";

import type {
    IPacienteRepository
} from "../../../domain/repositories/IPacienteRepository.js";


export interface AgregarPacienteListaEsperaDTO {

    idPaciente: number;
    idMedico: number;
    fechaSolicitada: string;

}


export class AgregarPacienteListaEspera {

    constructor(
        private readonly listaEsperaRepository: IListaEsperaRepository,
        private readonly pacienteRepository: IPacienteRepository
    ) {}


    async ejecutar(
        datos: AgregarPacienteListaEsperaDTO
    ): Promise<ListaEspera> {

        // 1. Comprobar que el paciente exista
        const paciente = await this.pacienteRepository.buscarPorId(
            datos.idPaciente
        );

        if (!paciente) {

            throw new Error(
                "No se puede agregar a la lista de espera: el paciente no existe."
            );

        }


        // 2. Comprobar si ya existe una solicitud pendiente
        const solicitudExistente =
            await this.listaEsperaRepository.buscarPendientePorPaciente(
                datos.idPaciente,
                datos.idMedico,
                datos.fechaSolicitada
            );


        if (solicitudExistente) {

            throw new Error(
                "El paciente ya se encuentra en la lista de espera para ese médico y fecha."
            );

        }


        // 3. Crear la solicitud de lista de espera
        const listaEspera = ListaEspera.crear({

            idPaciente: datos.idPaciente,

            idMedico: datos.idMedico,

            fechaSolicitada: datos.fechaSolicitada

        });


        // 4. Guardar la solicitud en MySQL
        return await this.listaEsperaRepository.guardar(
            listaEspera
        );

    }

}
