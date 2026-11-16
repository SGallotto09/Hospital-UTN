// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import GestionCamasView from '../views/GestionCamasView.vue'
import AsignarCamaForm from '../components/AsignarCamaForm.vue'
import TransicionCamaForm from '../components/TransicionCamaForm.vue'
import { crearCamasApi, ErrorCamasApi } from '../services/recursosCamasApi'
import type { Cama, CamasApi } from '../services/recursosCamasApi'

vi.mock('../components/RecursosCamasNav.vue', () => ({ default: { template: '<nav />' } }))

const cama: Cama = {
  id: 101,
  estado: 'Libre',
  habitacion: 204,
  piso: 2,
  idTipoCama: 1,
  tipo: 'Compartida',
  disponible: true,
  idAsignacionActiva: null,
}
const asignacion = {
  id: 4,
  idCama: 101,
  idPaciente: 8,
  idUsuarioAsignador: 3,
  fechaIngreso: '2026-11-15T12:00:00Z',
}

function crearApi(): CamasApi {
  return {
    listar: vi.fn().mockResolvedValue([cama]),
    listarTiposCama: vi.fn().mockResolvedValue([{ id: 1, nombre: 'Compartida' }]),
    registrar: vi.fn().mockResolvedValue({ id: 102, estado: 'Libre', habitacion: 205, piso: 2, idTipoCama: 1 }),
    asignar: vi.fn().mockResolvedValue(asignacion),
    buscarPacientePorDni: vi.fn().mockResolvedValue({ id: 8, nombre: 'Ana', apellido: 'Prueba', dni: '12345678' }),
    transicionar: vi.fn(),
  }
}

describe('formulario de asignación', () => {
  it.each(['', '0', '-2', '1.5', '2e2', '2147483648', 'abc'])(
    'no confirma sin buscar y seleccionar un paciente: %s',
    async (valor) => {
      const wrapper = mount(AsignarCamaForm, { props: { cama, enviando: false, buscarPaciente: vi.fn() } })
      await wrapper.get('input').setValue(valor)
      await wrapper.get('form').trigger('submit')
      expect(wrapper.emitted('confirmar')).toBeUndefined()
      wrapper.unmount()
    },
  )
})

describe('búsqueda por DNI en el formulario', () => {
  const paciente = { id: 8, nombre: 'Ana', apellido: 'Prueba', dni: '12345678' }

  it('muestra los datos, confirma el ID y borra la selección al editar el DNI', async () => {
    const buscarPaciente = vi.fn().mockResolvedValue(paciente)
    const wrapper = mount(AsignarCamaForm, { props: { cama, enviando: false, buscarPaciente } })
    await wrapper.get('input').setValue(paciente.dni)
    await wrapper.get('button[type="button"]').trigger('click')
    await flushPromises()
    expect(buscarPaciente).toHaveBeenCalledExactlyOnceWith(paciente.dni)
    expect(wrapper.get('[role="status"]').text()).toContain('Ana Prueba')
    expect(wrapper.get('[role="status"]').text()).toContain(paciente.dni)
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('confirmar')).toEqual([[8]])
    await wrapper.get('input').setValue('87654321')
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('confirmar')).toEqual([[8]])
    wrapper.unmount()
  })

  it.each(['resuelve', 'rechaza'])('descarta una búsqueda anterior que %s, incluso si se vuelve al mismo DNI', async resultado => {
    let resolver!: (encontrado: typeof paciente) => void
    let rechazar!: (error: Error) => void
    const buscarPaciente = vi.fn()
      .mockImplementationOnce(() => new Promise((resolve, reject) => { resolver = resolve; rechazar = reject }))
      .mockResolvedValueOnce(paciente)
    const wrapper = mount(AsignarCamaForm, { props: { cama, enviando: false, buscarPaciente } })
    await wrapper.get('input').setValue(paciente.dni)
    await wrapper.get('button[type="button"]').trigger('click')
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    await wrapper.get('input').setValue('87654321')
    await wrapper.get('input').setValue(paciente.dni)
    await wrapper.get('button[type="button"]').trigger('click')
    await flushPromises()
    if (resultado === 'resuelve') resolver({ ...paciente, id: 99, nombre: 'Respuesta anterior' })
    else rechazar(new Error('Error anterior'))
    await flushPromises()
    expect(wrapper.text()).not.toContain('Respuesta anterior')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('confirmar')).toEqual([[8]])
    wrapper.unmount()
  })

  it.each(['No se encontró un paciente con ese DNI.', 'No se pudo conectar.'])(
    'muestra el fallo de búsqueda sin habilitar confirmación: %s', async mensaje => {
      const buscarPaciente = vi.fn().mockRejectedValue(new Error(mensaje))
      const wrapper = mount(AsignarCamaForm, { props: { cama, enviando: false, buscarPaciente } })
      await wrapper.get('input').setValue(paciente.dni)
      await wrapper.get('button[type="button"]').trigger('click')
      await flushPromises()
      expect(wrapper.get('[role="alert"]').text()).toBe(mensaje)
      await wrapper.get('form').trigger('submit')
      expect(wrapper.emitted('confirmar')).toBeUndefined()
      wrapper.unmount()
    },
  )

  it('no busca un DNI vacío', async () => {
    const buscarPaciente = vi.fn()
    const wrapper = mount(AsignarCamaForm, { props: { cama, enviando: false, buscarPaciente } })
    await wrapper.get('input').setValue('   ')
    await wrapper.get('button[type="button"]').trigger('click')
    expect(buscarPaciente).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})

describe('vista integrada con servicio inyectado', () => {
  it('registra una cama y refresca el listado', async () => {
    const api = crearApi()
    api.listar = vi.fn()
      .mockResolvedValueOnce([cama])
      .mockResolvedValueOnce([{ ...cama, id: 102, habitacion: 205 }])
    const wrapper = mount(GestionCamasView, { props: { api } })
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '+ Nueva cama')!.trigger('click')
    await flushPromises()
    const inputs = wrapper.findAll('.alta-cama input')
    await inputs[0]!.setValue('205')
    await inputs[1]!.setValue('2')
    await wrapper.get('.alta-cama select').setValue('1')
    await wrapper.get('.alta-cama').trigger('submit')
    await flushPromises()
    expect(api.registrar).toHaveBeenCalledWith({ habitacion: 205, piso: 2, idTipoCama: 1 })
    expect(api.listar).toHaveBeenCalledTimes(2)
    expect(wrapper.get('[role="status"]').text()).toContain('Cama 102 registrada como Libre')
    expect(wrapper.text()).toContain('205')
    wrapper.unmount()
  })

  it('envía en el POST el ID recuperado por búsqueda, nunca el DNI numérico', async () => {
    const pacienteEncontrado = { id: 7, nombre: 'Ana', apellido: 'Prueba', dni: '35678901' }
    const solicitar = vi.fn<typeof fetch>(async (entrada, opciones) => {
      const url = String(entrada)
      let datos: unknown
      if (url === '/api/recursos-camas/camas') {
        datos = { camas: [{ ...cama, id: 2 }] }
      } else if (url === '/api/recursos-camas/pacientes?dni=35678901') {
        datos = { paciente: pacienteEncontrado }
      } else if (url === '/api/recursos-camas/asignaciones' && opciones?.method === 'POST') {
        datos = { asignacion: { ...asignacion, idCama: 2, idPaciente: 7 } }
      } else {
        throw new Error(`Solicitud inesperada: ${url}`)
      }
      return new Response(JSON.stringify(datos), {
        status: opciones?.method === 'POST' ? 201 : 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })
    const api = crearCamasApi('/api/recursos-camas', solicitar)
    const wrapper = mount(GestionCamasView, { props: { api } })
    await flushPromises()
    await wrapper.get('article button').trigger('click')
    await wrapper.get('#paciente-dni').setValue(pacienteEncontrado.dni)
    await wrapper.findAll('button').find(boton => boton.text() === 'Buscar paciente')!.trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="status"]').text()).toContain('DNI: 35678901')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const escrituras = solicitar.mock.calls.filter(([, opciones]) => opciones?.method === 'POST')
    expect(escrituras).toHaveLength(1)
    expect(escrituras[0]?.[0]).toBe('/api/recursos-camas/asignaciones')
    expect(JSON.parse(String(escrituras[0]?.[1]?.body))).toEqual({ idCama: 2, idPaciente: 7 })
    wrapper.unmount()
  })

  it('mantiene un único formulario al alternar asignación y mantenimiento', async () => {
    const api = crearApi()
    const wrapper = mount(GestionCamasView, { props: { api } })
    await flushPromises()
    await wrapper.get('article button').trigger('click')
    expect(wrapper.findComponent(AsignarCamaForm).exists()).toBe(true)
    const bloquear = wrapper
      .findAll('button')
      .find((boton) => boton.text() === 'Bloquear por mantenimiento')!
    await bloquear.trigger('click')
    expect(wrapper.findComponent(AsignarCamaForm).exists()).toBe(false)
    expect(wrapper.findComponent(TransicionCamaForm).exists()).toBe(true)
    await wrapper.get('article button').trigger('click')
    expect(wrapper.findComponent(AsignarCamaForm).exists()).toBe(true)
    expect(wrapper.findComponent(TransicionCamaForm).exists()).toBe(false)
    expect(api.asignar).not.toHaveBeenCalled()
    expect(api.transicionar).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('cancela cualquiera de los formularios sin enviar comandos', async () => {
    const api = crearApi()
    const wrapper = mount(GestionCamasView, { props: { api } })
    await flushPromises()
    await wrapper.get('article button').trigger('click')
    await wrapper.findAll('form button').find(boton => boton.text() === 'Cancelar')!.trigger('click')
    expect(wrapper.find('form').exists()).toBe(false)
    const bloquear = wrapper
      .findAll('button')
      .find((boton) => boton.text() === 'Bloquear por mantenimiento')!
    await bloquear.trigger('click')
    await wrapper.findAll('form button').find(boton => boton.text() === 'Cancelar')!.trigger('click')
    expect(wrapper.find('form').exists()).toBe(false)
    expect(api.asignar).not.toHaveBeenCalled()
    expect(api.transicionar).not.toHaveBeenCalled()
    wrapper.unmount()
  })
  it('carga el mapa, asigna y vuelve a consultar sin ocupar localmente', async () => {
    const api = crearApi()
    const wrapper = mount(GestionCamasView, { props: { api } })
    await flushPromises()
    await wrapper.get('article button').trigger('click')
    await wrapper.get('input').setValue('12345678')
    await wrapper.findAll('button').find(boton => boton.text() === 'Buscar paciente')!.trigger('click')
    await flushPromises()
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(api.asignar).toHaveBeenCalledWith(101, 8)
    expect(api.listar).toHaveBeenCalledTimes(2)
    expect(wrapper.get('[role="status"]').text()).toContain('asignada')
    wrapper.unmount()
  })

  it('impide confirmar dos veces mientras la petición sigue pendiente', async () => {
    const api = crearApi()
    let resolver!: (valor: typeof asignacion) => void
    api.asignar = vi.fn(
      () =>
        new Promise<typeof asignacion>((resolve) => {
          resolver = resolve
        }),
    )
    const wrapper = mount(GestionCamasView, { props: { api } })
    await flushPromises()
    await wrapper.get('article button').trigger('click')
    await wrapper.get('input').setValue('12345678')
    await wrapper.findAll('button').find(boton => boton.text() === 'Buscar paciente')!.trigger('click')
    await flushPromises()
    await wrapper.get('form').trigger('submit')
    await wrapper.get('form').trigger('submit')
    expect(api.asignar).toHaveBeenCalledTimes(1)
    resolver(asignacion)
    await flushPromises()
    wrapper.unmount()
  })

  it('ante 409 actualiza el mapa y muestra el conflicto', async () => {
    const api = crearApi()
    api.asignar = vi.fn().mockRejectedValue(new ErrorCamasApi(409, 'La cama acaba de ser ocupada.'))
    vi.mocked(api.listar)
      .mockResolvedValueOnce([cama])
      .mockResolvedValueOnce([{ ...cama, estado: 'Ocupada', disponible: false }])
    const wrapper = mount(GestionCamasView, { props: { api } })
    await flushPromises()
    await wrapper.get('article button').trigger('click')
    await wrapper.get('input').setValue('12345678')
    await wrapper.findAll('button').find(boton => boton.text() === 'Buscar paciente')!.trigger('click')
    await flushPromises()
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Revisá el estado actualizado')
    expect(wrapper.get('article button').attributes('disabled')).toBeDefined()
    expect(wrapper.find('form').exists()).toBe(false)
    wrapper.unmount()
  })

  it('un fallo de carga no muestra datos ficticios ni habilita asignaciones', async () => {
    const api = crearApi()
    api.listar = vi.fn().mockRejectedValue(new ErrorCamasApi(503, 'API no disponible'))
    const wrapper = mount(GestionCamasView, { props: { api } })
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('API no disponible')
    expect(wrapper.findAll('article')).toHaveLength(0)
    wrapper.unmount()
  })
})

describe('cliente HTTP', () => {
  it('busca por DNI codificado usando las cookies existentes', async () => {
    const paciente = { id: 8, nombre: 'Ana', apellido: 'Prueba', dni: '12 345' }
    const solicitar = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ paciente }), {
      headers: { 'Content-Type': 'application/json' },
    }))
    await expect(crearCamasApi('/api/recursos-camas', solicitar).buscarPacientePorDni(paciente.dni))
      .resolves.toEqual(paciente)
    expect(solicitar).toHaveBeenCalledExactlyOnceWith('/api/recursos-camas/pacientes?dni=12%20345', { credentials: 'same-origin' })
  })
  it.each([401, 403, 409, 503])(
    'conserva el estado HTTP %s y no reintenta la escritura',
    async (status) => {
      const solicitar = vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ mensaje: 'Operación rechazada' }), {
          status,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      const api = crearCamasApi('/api/recursos-camas', solicitar)
      await expect(api.asignar(101, 8)).rejects.toMatchObject({
        status,
        message: 'Operación rechazada',
      })
      expect(solicitar).toHaveBeenCalledOnce()
    },
  )
  it('conserva el mensaje alternativo si el error HTTP no trae mensaje', async () => {
    const solicitar = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('{}', {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    await expect(crearCamasApi('/api/recursos-camas', solicitar).listar()).rejects.toThrow(
      'No se pudo completar la operación.',
    )
  })
  it('envía sólo IDs de cama y paciente; la identidad la resuelve IAM', async () => {
    const solicitar = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ asignacion }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    expect(await crearCamasApi('/api/recursos-camas', solicitar).asignar(101, 8)).toEqual(
      asignacion,
    )
    expect(solicitar).toHaveBeenCalledWith(
      '/api/recursos-camas/asignaciones',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        body: JSON.stringify({ idCama: 101, idPaciente: 8 }),
      }),
    )
  })
  it('una respuesta HTML del servidor Vite no se interpreta como API exitosa', async () => {
    const solicitar = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('<html></html>', {
        headers: { 'Content-Type': 'text/html' },
      }),
    )
    await expect(crearCamasApi('/api/recursos-camas', solicitar).listar()).rejects.toThrow(
      'no está disponible',
    )
  })
})
