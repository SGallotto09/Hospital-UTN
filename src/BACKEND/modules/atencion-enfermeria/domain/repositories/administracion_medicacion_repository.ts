import type { AdministracionMedicacion } from '../entities/administracion_medicacion.js';

export interface AdministracionMedicacionRepository {
    obtenerTodas(): Promise<AdministracionMedicacion[]>;
}
