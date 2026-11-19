import { DashboardRepositoryMySQL } from '../../repositories/dashboard_repository_mysql.js';
import { ObtenerDashboard } from '../../../use-cases/dashboard/obtener_dashboard.js';
import { DashboardController } from './dashboard_controller.js';

const repositorio = new DashboardRepositoryMySQL();

const obtenerDashboard = new ObtenerDashboard(repositorio);

export const dashboardController = new DashboardController(
    obtenerDashboard
);
