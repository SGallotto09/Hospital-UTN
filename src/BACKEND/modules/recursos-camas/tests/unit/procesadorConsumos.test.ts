import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { iniciarProcesadorConsumos } from '../../infraestructure/procesarConsumosPendientes.js'
import { ErrorRecursosCamas } from '../../domain/errors/ErrorRecursosCamas.js'

const fila = { id_administracion: 20, id_insumo: 4, cantidad: 1, piso: 2 }
const resultado = {
  estado: 'descontado' as const, idEvento: 'medicacion:20', idAdministracion: 20,
  idInsumo: 4, cantidadDescontada: 1, stockRestante: 49,
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('procesador asíncrono de consumos persistidos', () => {
  it('lee pendientes y construye el evento estable', async () => {
    const query = vi.fn().mockResolvedValue([[fila], []])
    const consumir = vi.fn().mockResolvedValue(resultado)
    const detener = iniciarProcesadorConsumos({ query }, consumir)
    await vi.advanceTimersByTimeAsync(0)
    expect(consumir).toHaveBeenCalledExactlyOnceWith({
      tipo: 'MedicacionAdministrada', version: 1, idEvento: 'medicacion:20',
      idAdministracion: 20, idInsumo: 4, cantidad: 1, piso: 2,
    })
    expect(query.mock.calls[0]?.[0]).toContain("estado = 'pendiente'")
    expect(query.mock.calls[0]?.[0]).toContain('LIMIT 10')
    await detener()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('no superpone ciclos y espera el trabajo en curso al detenerse', async () => {
    let resolver!: (valor: typeof resultado) => void
    const consumir = vi.fn(() => new Promise<typeof resultado>(resolve => { resolver = resolve }))
    const query = vi.fn().mockResolvedValue([[fila, { ...fila, id_administracion: 21 }], []])
    const detener = iniciarProcesadorConsumos({ query }, consumir)
    await vi.advanceTimersByTimeAsync(20000)
    expect(query).toHaveBeenCalledOnce()
    expect(consumir).toHaveBeenCalledOnce()
    let detenido = false
    const cierre = detener().then(() => { detenido = true })
    await Promise.resolve()
    expect(detenido).toBe(false)
    resolver(resultado)
    await cierre
    expect(detenido).toBe(true)
    await vi.advanceTimersByTimeAsync(20000)
    expect(query).toHaveBeenCalledOnce()
    expect(consumir).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each(['STOCK_INSUFICIENTE', 'PISO_INSUMO_INVALIDO'] as const)(
    'envía a revisión sin sobrescribir un procesado concurrente: %s', async codigo => {
      const query = vi.fn().mockResolvedValueOnce([[fila], []]).mockResolvedValueOnce([{ affectedRows: 0 }, []])
      const consumir = vi.fn().mockRejectedValue(new ErrorRecursosCamas(codigo, 'Requiere revisión'))
      const detener = iniciarProcesadorConsumos({ query }, consumir)
      await vi.advanceTimersByTimeAsync(0)
      expect(query.mock.calls[1]).toEqual([
        "UPDATE consumos_medicacion SET estado = 'revision' WHERE id_administracion = ? AND estado = 'pendiente'",
        [20],
      ])
      await detener()
    },
  )

  it('reintenta un error transitorio sin marcar revisión ni confirmar entrega', async () => {
    const query = vi.fn().mockResolvedValue([[fila], []])
    const consumir = vi.fn().mockRejectedValueOnce(new Error('Conexión perdida')).mockResolvedValueOnce(resultado)
    const detener = iniciarProcesadorConsumos({ query }, consumir)
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(5000)
    expect(consumir).toHaveBeenCalledTimes(2)
    expect(query.mock.calls.every(([sql]) => sql.startsWith('SELECT'))).toBe(true)
    await detener()
  })

  it('recupera los pendientes al reiniciar el procesador', async () => {
    const query = vi.fn().mockResolvedValue([[fila], []])
    const consumir = vi.fn().mockRejectedValueOnce(new Error('Interrupción')).mockResolvedValueOnce(resultado)
    const primero = iniciarProcesadorConsumos({ query }, consumir)
    await vi.advanceTimersByTimeAsync(0)
    await primero()
    const segundo = iniciarProcesadorConsumos({ query }, consumir)
    await vi.advanceTimersByTimeAsync(0)
    expect(consumir).toHaveBeenCalledTimes(2)
    await segundo()
  })

  it('un fallo de lectura no detiene los ciclos posteriores', async () => {
    const query = vi.fn().mockRejectedValueOnce(new Error('Sin conexión')).mockResolvedValueOnce([[], []])
    const consumir = vi.fn()
    const detener = iniciarProcesadorConsumos({ query }, consumir)
    await vi.advanceTimersByTimeAsync(5000)
    expect(query).toHaveBeenCalledTimes(2)
    expect(consumir).not.toHaveBeenCalled()
    await detener()
  })
})
