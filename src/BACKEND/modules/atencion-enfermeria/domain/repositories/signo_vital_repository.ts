import type {SignoVital} from "../entities/signos_vitales.ts";

export interface SignoVitalRepository {
    guardar(signoVital: Omit<SignoVital, 'id' | 'fecha_hora'>): Promise<SignoVital>;

    obtenerPorPaciente(idPaciente: number): Promise<SignoVital[]>;
    
    obtenerTodos(): Promise<SignoVital[]>;
}