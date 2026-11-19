
import { ProtocoloAtencionRepositoryMysql } from '../../repositories/protocolo_atencion_repository_mysql.js';
import { GenerarProtocolo } from '../../../use-cases/protocolos/generar_protocolos.js';

export const protocolo_repository = new ProtocoloAtencionRepositoryMysql();

export const generar_protocolo_use_case = new GenerarProtocolo(
    protocolo_repository
);
