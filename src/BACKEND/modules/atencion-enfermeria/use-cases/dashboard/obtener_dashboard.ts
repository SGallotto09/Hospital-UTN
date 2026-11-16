
import type { DashboardRepository } from '../../domain/repositories/dashboard_repository.js';

export class ObtenerDashboard {
    constructor(
        private readonly dashboardRepository: DashboardRepository
    ) {}

    async ejecutar() {
        return this.dashboardRepository.obtenerPacientes();
    }
}
