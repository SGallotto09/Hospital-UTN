import { describe, expect, it, vi } from 'vitest'
import { Insumo } from '../../domain/entities/Insumo.js'
import { ProcesarConsumoInsumo } from '../../application/use-cases/ProcesarConsumoInsumo.js'
import type { MedicacionAdministrada } from '../../application/ports/MedicacionAdministrada.js'

const evento: MedicacionAdministrada = {
  tipo: 'MedicacionAdministrada',
  version: 1,
  idEvento: 'medicacion-20',
  idAdministracion: 20,
  idInsumo: 4,
  cantidad: 1,
  piso: 2,
}
const datos = { id: 4, nombre: 'Ibuprofeno 400mg', stock: 50, piso: 2 }

describe('HU 3.1: Insumo', () => {
  it('descuenta de 50 a 49 unidades en el piso correspondiente', () => {
    const insumo = new Insumo(datos)
    insumo.descontar(1, 2)
    expect(insumo.stock).toBe(49)
  })
  it('permite consumir exactamente las existencias', () => {
    const insumo = new Insumo(datos)
    insumo.descontar(50, 2)
    expect(insumo.stock).toBe(0)
  })
  it('rechaza stock insuficiente sin modificarlo', () => {
    const insumo = new Insumo(datos)
    expect(() => insumo.descontar(51, 2)).toThrow()
    expect(insumo.stock).toBe(50)
  })
  it.each([0, -1, 1.5, NaN, Infinity, 2147483648])('rechaza cantidad %s', (cantidad) => {
    const insumo = new Insumo(datos)
    expect(() => insumo.descontar(cantidad, 2)).toThrow()
    expect(insumo.stock).toBe(50)
  })
  it.each([null, 3])('no toma stock de otro piso o sin piso (%s)', (piso) => {
    const insumo = new Insumo({ ...datos, piso })
    expect(() => insumo.descontar(1, 2)).toThrow()
    expect(insumo.stock).toBe(50)
  })
  it.each([0, -1])('admite piso %s si coincide con la ubicación', (piso) => {
    const insumo = new Insumo({ ...datos, piso })
    insumo.descontar(1, piso)
    expect(insumo.stock).toBe(49)
  })
  it.each([-1, 1.2, NaN, 2147483648])('no construye stock inválido %s', (stock) => {
    expect(() => new Insumo({ ...datos, stock })).toThrow()
  })
})

describe('HU 3.1: recepción de MedicacionAdministrada', () => {
  it('valida y delega sin descontar localmente ni inventar persistencia', async () => {
    const resultado = {
      estado: 'descontado' as const,
      idEvento: evento.idEvento,
      idAdministracion: 20,
      idInsumo: 4,
      cantidadDescontada: 1,
      stockRestante: 49,
    }
    const procesarConsumo = vi.fn().mockResolvedValue(resultado)
    const caso = new ProcesarConsumoInsumo({ listar: vi.fn(), procesarConsumo })
    expect(await caso.ejecutar(evento)).toEqual(resultado)
    expect(procesarConsumo).toHaveBeenCalledWith({
      idEvento: 'medicacion-20',
      idAdministracion: 20,
      idInsumo: 4,
      cantidad: 1,
      piso: 2,
    })
  })
  it.each([null, [], {}, 'evento'])('rechaza envoltura inválida %j', async (datos) => {
    const procesarConsumo = vi.fn()
    await expect(
      new ProcesarConsumoInsumo({ listar: vi.fn(), procesarConsumo }).ejecutar(datos),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' })
    expect(procesarConsumo).not.toHaveBeenCalled()
  })
  it.each([
    { tipo: 'MedicacionIndicada' },
    { version: 2 },
    { idEvento: '' },
    { idEvento: '   ' },
    { idEvento: ' evento ' },
    { idAdministracion: 0 },
    { idInsumo: -1 },
    { cantidad: 0 },
    { cantidad: -1 },
    { cantidad: 1.5 },
    { cantidad: '1' },
    { piso: null },
    { piso: 1.5 },
    { piso: '2' },
    { piso: 2147483648 },
  ])('rechaza datos inválidos antes de tocar inventario %j', async (reemplazo) => {
    const procesarConsumo = vi.fn()
    const caso = new ProcesarConsumoInsumo({ listar: vi.fn(), procesarConsumo })
    await expect(caso.ejecutar({ ...evento, ...reemplazo })).rejects.toMatchObject({
      codigo: 'DATOS_INVALIDOS',
    })
    expect(procesarConsumo).not.toHaveBeenCalled()
  })
  it('propaga el error para que el despachador no confirme entrega', async () => {
    const error = new Error('Fallo transitorio')
    const caso = new ProcesarConsumoInsumo({
      listar: vi.fn(),
      procesarConsumo: vi.fn().mockRejectedValue(error),
    })
    await expect(caso.ejecutar(evento)).rejects.toBe(error)
  })
})
