import { describe, expect, it, vi } from 'vitest'
import type { Request, Response } from 'express'
import { CamasController } from '../../presentation/controlers/CamasController.js'
import { InventarioController } from '../../presentation/controlers/InventarioController.js'

function prepararRespuesta() {
  const status = vi.fn().mockReturnThis()
  const json = vi.fn()
  return { status, json, res: { status, json } as unknown as Response }
}

describe('controladores de sólo lectura sin gateway de Admisión', () => {
  it('devuelve camas usando la consulta inyectada y permisos reales como contrato', async () => {
    const listar = vi.fn().mockResolvedValue([])
    const controller = new CamasController(
      { listar },
      undefined,
      () => ({ idUsuario: 7, permisos: ['camas:consultar'] }),
      undefined,
    )
    const { res, status, json } = prepararRespuesta()
    const next = vi.fn()
    await controller.listar({} as Request, res, next)
    expect(listar).toHaveBeenCalledOnce()
    expect(status).toHaveBeenCalledWith(200)
    expect(json).toHaveBeenCalledWith({ camas: [] })
    expect(next).not.toHaveBeenCalled()
  })

  it.each([undefined, { idUsuario: 7, permisos: [] }])(
    'sin autorización no consulta MySQL: %j',
    async (actor) => {
      const listar = vi.fn()
      const controller = new CamasController({ listar }, undefined, () => actor, undefined)
      const { res } = prepararRespuesta()
      const next = vi.fn()
      await controller.listar({} as Request, res, next)
      expect(listar).not.toHaveBeenCalled()
      expect(next.mock.calls[0]?.[0]).toMatchObject({
        codigo: actor ? 'ACCESO_DENEGADO' : 'AUTENTICACION_REQUERIDA',
      })
    },
  )

  it('no permite invocar asignación si el montaje no configuró escrituras', async () => {
    const controller = new CamasController(
      { listar: vi.fn() },
      undefined,
      () => ({ idUsuario: 7, permisos: ['camas:asignar'] }),
      undefined,
    )
    const { res, json } = prepararRespuesta()
    const next = vi.fn()
    await controller.asignar({} as Request, res, next)
    expect(next.mock.calls[0]?.[0]).toMatchObject({ codigo: 'TRANSACCIONES_NO_DISPONIBLES' })
    expect(json).not.toHaveBeenCalled()
  })

  it('propaga errores de conexión sin devolver una lista ficticia', async () => {
    const error = new Error('Error de conexión')
    const controller = new InventarioController(
      { listar: vi.fn().mockRejectedValue(error), procesarConsumo: vi.fn() },
      () => ({ idUsuario: 7, permisos: ['inventario:consultar'] }),
    )
    const { res, json } = prepararRespuesta()
    const next = vi.fn()
    await controller.listar({} as Request, res, next)
    expect(next).toHaveBeenCalledWith(error)
    expect(json).not.toHaveBeenCalled()
  })
})
