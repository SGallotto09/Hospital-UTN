import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import {
  Insumo,
  type InsumoDatos,
  validarCantidad,
  validarPiso,
} from '../../domain/entities/Insumo.js'
import type {
  IInsumoRepository,
  ConsumoInsumo,
  ResultadoConsumo,
} from '../../domain/repositories/IInsumoRepository.js'
import { ErrorRecursosCamas, validarId } from '../../domain/errors/ErrorRecursosCamas.js'
import type { EjecutorMysql, ProveedorTransaccionesMysql } from '../database/ContratosMysql.js'
import type { RegistroConsumosMysql } from '../database/RegistroConsumosMysql.js'

interface InsumoFila extends RowDataPacket, InsumoDatos {}

export class MysqlInsumoRepository implements IInsumoRepository {
  constructor(
    private readonly lectura: EjecutorMysql,
    private readonly transacciones?: ProveedorTransaccionesMysql,
    private readonly registroConsumos?: RegistroConsumosMysql,
  ) {}

  async listar(): Promise<InsumoDatos[]> {
    const [filas] = await this.lectura.execute<InsumoFila[]>(
      'SELECT id, nombre, stock, piso FROM insumos ORDER BY piso, nombre, id',
    )
    return filas.map((fila) => ({
      id: fila.id,
      nombre: fila.nombre,
      stock: fila.stock,
      piso: fila.piso,
    }))
  }

  async procesarConsumo(consumo: ConsumoInsumo): Promise<ResultadoConsumo> {
    validarId(consumo.idInsumo, 'idInsumo')
    validarCantidad(consumo.cantidad)
    validarPiso(consumo.piso)
    const registro = this.registroConsumos
    if (!registro) {
      throw new ErrorRecursosCamas(
        'DEDUPLICACION_NO_DISPONIBLE',
        'El descuento requiere un registro durable de consumos para evitar duplicados.',
      )
    }
    if (!this.transacciones) {
      throw new ErrorRecursosCamas(
        'TRANSACCIONES_NO_DISPONIBLES',
        'El registro del consumo y el descuento requieren transacciones exclusivas con MySQL compartido.',
      )
    }
    return this.transacciones.ejecutar(async (db) => {
      const registroResultado = await registro.registrarSiNuevo(db, consumo)
      if (registroResultado === 'duplicado') {
        return {
          estado: 'duplicado',
          idEvento: consumo.idEvento,
          idAdministracion: consumo.idAdministracion,
          idInsumo: consumo.idInsumo,
          cantidadDescontada: 0,
          stockRestante: null,
        }
      }
      if (registroResultado !== 'nuevo')
        throw new Error('El registro de consumos devolvió un resultado inválido.')
      const [filas] = await db.execute<InsumoFila[]>(
        'SELECT id, nombre, stock, piso FROM insumos WHERE id = ? FOR UPDATE',
        [consumo.idInsumo],
      )
      const fila = filas[0]
      if (!fila) throw new ErrorRecursosCamas('INSUMO_NO_ENCONTRADO', 'El insumo no existe.')
      const insumo = new Insumo(fila)
      insumo.descontar(consumo.cantidad, consumo.piso)
      const [resultado] = await db.execute<ResultSetHeader>(
        'UPDATE insumos SET stock = stock - ? WHERE id = ? AND piso = ? AND stock >= ?',
        [consumo.cantidad, consumo.idInsumo, consumo.piso, consumo.cantidad],
      )
      if (resultado.affectedRows !== 1) {
        throw new ErrorRecursosCamas(
          'STOCK_INSUFICIENTE',
          'No se pudo descontar el consumo. Revisá stock y piso.',
        )
      }
      return {
        estado: 'descontado',
        idEvento: consumo.idEvento,
        idAdministracion: consumo.idAdministracion,
        idInsumo: insumo.id,
        cantidadDescontada: consumo.cantidad,
        stockRestante: insumo.stock,
      }
    })
  }
}
