import type { AdministracionMedicacionRepository } from '../../domain/repositories/administracion_medicacion_repository.js';

export class ObtenerMedicaciones {
    constructor(
        private readonly administracionMedicacionRepository: AdministracionMedicacionRepository
    ) {}

    async ejecutar() {
        return await this.administracionMedicacionRepository.obtenerTodas();
    }
}