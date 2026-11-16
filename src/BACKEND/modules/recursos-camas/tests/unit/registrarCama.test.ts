import { describe, expect, it, vi } from 'vitest'
import { RegistrarCama } from '../../application/use-cases/RegistrarCama.js'
import { Cama } from '../../domain/entities/Cama.js'
import { ErrorRecursosCamas } from '../../domain/errors/ErrorRecursosCamas.js'

describe('RegistrarCama', () => {
  it('valida los enteros antes de delegar y conserva estado Libre', async () => {
    const registrar = vi.fn(async (datos: { habitacion: number; piso: number; idTipoCama: number }) =>
      new Cama({ id: 14, estado: 'Libre', ...datos }),
    )
    const caso = new RegistrarCama({ registrar })
    const cama = await caso.ejecutar({ habitacion: 205, piso: 2, idTipoCama: 1 })
    expect(cama.estado).toBe('Libre')
    expect(registrar).toHaveBeenCalledWith({ habitacion: 205, piso: 2, idTipoCama: 1 })
  })

  it.each([
    { habitacion: 0, piso: 2, idTipoCama: 1 },
    { habitacion: 1.5, piso: 2, idTipoCama: 1 },
    { habitacion: 1, piso: 2, idTipoCama: 2147483648 },
  ])('rechaza valores incompatibles con INT positivo: %j', async (datos) => {
    const registrar = vi.fn()
    await expect(new RegistrarCama({ registrar }).ejecutar(datos)).rejects.toBeInstanceOf(
      ErrorRecursosCamas,
    )
    expect(registrar).not.toHaveBeenCalled()
  })
})
