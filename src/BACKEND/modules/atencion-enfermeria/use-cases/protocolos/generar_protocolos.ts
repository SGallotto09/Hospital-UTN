
import type { ProtocoloAtencion } from '../../domain/entities/protocolo_atencion.js';
import type { ProtocoloBuilder } from '../../domain/builders/protocolo_builder.js';
import type { ProtocoloAtencionRepository } from '../../domain/repositories/protocolo_atencion_repository.js';

import { PreOpProtocolBuilder } from '../../domain/builders/pre_op_protocol_builder.js';
import { RespiratoryProtocolBuilder } from '../../domain/builders/respiratory_protocol_builder.js';

export type MotivoIngreso = 'Prequirurgico' | 'Neumonia';

export class GenerarProtocolo {
    constructor(
        private readonly protocolo_repository: ProtocoloAtencionRepository
    ) {}

    async ejecutar(
        id_paciente: number,
        motivo_ingreso: MotivoIngreso
    ): Promise<ProtocoloAtencion> {

        if (!Number.isSafeInteger(id_paciente) || id_paciente <= 0) {
            throw new Error('El ID del paciente no es válido.');
        }

        let builder: ProtocoloBuilder;

        switch (motivo_ingreso) {
            case 'Prequirurgico':
                builder = new PreOpProtocolBuilder();
                break;

            case 'Neumonia':
                builder = new RespiratoryProtocolBuilder();
                break;

            default:
                throw new Error('El motivo de ingreso no tiene un protocolo configurado.');
        }

        builder.reiniciar(id_paciente);

        const protocolo = builder.obtener_protocolo();

        protocolo.id = await this.protocolo_repository.guardar(protocolo);

        return protocolo;
    }
}
