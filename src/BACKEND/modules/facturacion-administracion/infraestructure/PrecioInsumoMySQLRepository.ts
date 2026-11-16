
import type { RowDataPacket } from 'mysql2';

import { Database } from '../../../database/connectionDB.js';

import type { IPrecioInsumoRepository } from '../domain/repositories/IPrecioInsumoRepository.js';

export class PrecioInsumoMySQLRepository implements IPrecioInsumoRepository {

  async obtenerPrecio(idInsumo: number): Promise<number | null> {

    const db = Database.getInstance();

    const [resultado] = await db.query(
      'SELECT precio_unitario FROM precios_insumos WHERE id_insumo = ?',
      [idInsumo]
    );

    const filas = resultado as RowDataPacket[];

    if (filas.length === 0) {
      return null;
    }

    return Number(filas[0]?.precio_unitario);
  }

}
