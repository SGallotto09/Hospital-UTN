import { describe, expect, it, vi } from 'vitest'
import { prepararMysql } from '../helpers/mysql.js'
import { MysqlAsignacionCamaRepository } from '../../infraestructure/repositories/MysqlAsignacionCamaRepository.js'
import { MysqlConsultaCamas } from '../../infraestructure/repositories/MysqlConsultaCamas.js'
import { ConsultaMysqlCompartida } from '../../infraestructure/database/ConsultaMysqlCompartida.js'

const solicitud = { idCama: 101, idPaciente: 8, idUsuarioAsignador: 3 }
const fila = { id: 101, estado: 'libres', habitacion: 204, piso: 2, id_tipo_cama: 1 }
const fecha = new Date('2026-11-15T12:00:00Z')

function preparar(respuestas: unknown[]) {
  const mysql = prepararMysql(respuestas)
  return { ...mysql, repository: new MysqlAsignacionCamaRepository(mysql.transacciones) }
}

describe('adaptador de asignaciones: contrato SQL', () => {
  it('falla explícitamente sin proveedor transaccional', async () => {
    await expect(
      new MysqlAsignacionCamaRepository().asignarSiDisponible(solicitud, (c) => c.ocupar()),
    ).rejects.toMatchObject({ codigo: 'TRANSACCIONES_NO_DISPONIBLES' })
  })

  it('bloquea antes de validar y actualiza e inserta en el mismo ejecutor', async () => {
    const { repository, ejecutarSql } = preparar([
      [fila],
      [],
      { affectedRows: 1 },
      { insertId: 40 },
      [{ fecha_ingreso: fecha }],
    ])
    const resultado = await repository.asignarSiDisponible(solicitud, (c) => c.ocupar())
    expect(resultado.id).toBe(40)
    expect(resultado.fechaIngreso).toEqual(fecha)
    expect(ejecutarSql.mock.calls[0]?.[0]).toContain('FOR UPDATE')
    expect(ejecutarSql.mock.calls[1]?.[0]).toContain('fecha_egreso IS NULL FOR UPDATE')
    expect(ejecutarSql.mock.calls[2]?.[1]).toEqual(['Ocupada', 101, 'libres'])
    expect(ejecutarSql.mock.calls[3]?.[1]).toEqual([101, 8, 3])
    expect(ejecutarSql.mock.calls[3]?.[0]).not.toContain('id_cama_activa')
  })

  it.each(['Ocupada', 'En limpieza', 'Bloqueada'])(
    'no escribe si la cama está %s',
    async (estado) => {
      const { repository, ejecutarSql } = preparar([[{ ...fila, estado }]])
      await expect(
        repository.asignarSiDisponible(solicitud, (c) => c.ocupar()),
      ).rejects.toMatchObject({ codigo: 'CAMA_NO_DISPONIBLE' })
      expect(ejecutarSql).toHaveBeenCalledTimes(1)
    },
  )

  it('rechaza una cama inexistente', async () => {
    const { repository } = preparar([[]])
    await expect(
      repository.asignarSiDisponible(solicitud, (c) => c.ocupar()),
    ).rejects.toMatchObject({ codigo: 'CAMA_NO_ENCONTRADA' })
  })

  it('rechaza Libre con asignación activa sin escribir', async () => {
    const { repository, ejecutarSql } = preparar([[fila], [{ id: 12 }]])
    await expect(
      repository.asignarSiDisponible(solicitud, (c) => c.ocupar()),
    ).rejects.toMatchObject({ codigo: 'CAMA_NO_DISPONIBLE' })
    expect(ejecutarSql).toHaveBeenCalledTimes(2)
  })

  it('no inserta si falla la actualización condicionada', async () => {
    const { repository, ejecutarSql } = preparar([[fila], [], { affectedRows: 0 }])
    await expect(
      repository.asignarSiDisponible(solicitud, (c) => c.ocupar()),
    ).rejects.toMatchObject({ codigo: 'CAMA_NO_DISPONIBLE' })
    expect(ejecutarSql).toHaveBeenCalledTimes(3)
  })

  it('traduce uq_cama_activa en conflicto', async () => {
    const duplicado = Object.assign(
      new Error("Duplicate entry for key 'asignaciones_camas.uq_cama_activa'"),
      { code: 'ER_DUP_ENTRY' },
    )
    const { repository } = preparar([[fila], [], { affectedRows: 1 }, duplicado])
    await expect(
      repository.asignarSiDisponible(solicitud, (c) => c.ocupar()),
    ).rejects.toMatchObject({ codigo: 'CAMA_NO_DISPONIBLE' })
  })

  it('propaga errores para que el proveedor real haga rollback', async () => {
    const error = new Error('Conexión perdida')
    const { repository } = preparar([[fila], [], { affectedRows: 1 }, error])
    await expect(repository.asignarSiDisponible(solicitud, (c) => c.ocupar())).rejects.toBe(error)
  })

  it('traduce uq_paciente_activo en conflicto aunque la cama esté libre', async () => {
    const duplicado = Object.assign(
      new Error("Duplicate entry '8' for key 'uq_paciente_activo'"),
      { code: 'ER_DUP_ENTRY' },
    )
    const { repository } = preparar([[fila], [], { affectedRows: 1 }, duplicado])
    await expect(repository.asignarSiDisponible(solicitud, c => c.ocupar()))
      .rejects.toMatchObject({ codigo: 'PACIENTE_YA_ASIGNADO' })
  })

  it('no oculta errores de otros índices únicos', async () => {
    const duplicado = Object.assign(new Error("Duplicate entry for key 'otro_indice'"), { code: 'ER_DUP_ENTRY' })
    const { repository } = preparar([[fila], [], { affectedRows: 1 }, duplicado])
    await expect(repository.asignarSiDisponible(solicitud, c => c.ocupar())).rejects.toBe(duplicado)
  })
})

describe('consulta del mapa', () => {
  it('una asignación activa impide ofrecer Libre como disponible', async () => {
    const { db } = preparar([[{ ...fila, tipo: 'Compartida', id_asignacion_activa: 25 }]])
    expect(await new MysqlConsultaCamas(db).listar()).toMatchObject([
      { estado: 'Libre', disponible: false, idAsignacionActiva: 25 },
    ])
  })
  it('ofrece una cama libre sin asignaciones', async () => {
    const { db } = preparar([[{ ...fila, tipo: 'Compartida', id_asignacion_activa: null }]])
    expect(await new MysqlConsultaCamas(db).listar()).toEqual([
      {
        id: 101,
        estado: 'Libre',
        habitacion: 204,
        piso: 2,
        idTipoCama: 1,
        tipo: 'Compartida',
        disponible: true,
        idAsignacionActiva: null,
      },
    ])
  })
  it('reutiliza el proveedor compartido para lectura', async () => {
    const query = vi.fn().mockResolvedValue([[], []])
    await new ConsultaMysqlCompartida({ query }).execute('SELECT id FROM camas')
    expect(query).toHaveBeenCalledWith('SELECT id FROM camas', undefined)
  })
})
