
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

        // 1. Validar el paciente
        if (
            !Number.isSafeInteger(datos.idPaciente) ||
            datos.idPaciente <= 0
        ) {
            throw new Error(
                "El identificador del paciente no es válido."
            );
        }

        // 2. Validar el médico
        if (
            !Number.isSafeInteger(datos.idMedico) ||
            datos.idMedico <= 0
        ) {
            throw new Error(
                "El identificador del médico no es válido."
            );
        }

        // 3. Validar la fecha
        if (
            typeof datos.fechaSolicitada !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(datos.fechaSolicitada)
        ) {
            throw new Error(
                "La fecha solicitada debe tener el formato YYYY-MM-DD."
            );
        }

        const [anio, mes, dia] = datos.fechaSolicitada
            .split("-")
            .map(Number);

        const fechaValidada = new Date(anio, mes - 1, dia);

        if (
            fechaValidada.getFullYear() !== anio ||
            fechaValidada.getMonth() !== mes - 1 ||
            fechaValidada.getDate() !== dia
        ) {
            throw new Error(
                "La fecha solicitada no es válida."
            );
        }

        // 4. Comprobar que el paciente exista
        const paciente = await this.pacienteRepository.buscarPorId(
            datos.idPaciente
        );

        if (!paciente) {
            throw new Error(
                "No se puede agregar a la lista de espera: el paciente no existe."
            );
        }

        // 5. Comprobar que no tenga una solicitud duplicada
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

        // 6. Crear la solicitud
        const listaEspera = ListaEspera.crear({
            idPaciente: datos.idPaciente,
            idMedico: datos.idMedico,
            fechaSolicitada: datos.fechaSolicitada
        });

        // 7. Guardar en MySQL
        return await this.listaEsperaRepository.guardar(
            listaEspera
        );
    }
}
