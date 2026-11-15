// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import GestionCamasView from '../views/GestionCamasView.vue'
import CamaCard from '../components/CamaCard.vue'
import TransicionCamaForm from '../components/TransicionCamaForm.vue'
import { crearCamasApi, ErrorCamasApi } from '../services/recursosCamasApi'
import type {
  Cama,
  CamasApi,
  AccionCama,
  ResultadoTransicion,
  SolicitudTransicion,
} from '../services/recursosCamasApi'

const cama: Cama = {
  id: 101,
  estado: 'Ocupada',
  piso: 2,
  habitacion: 204,
  idTipoCama: 1,
  tipo: 'Privada',
  disponible: false,
  idAsignacionActiva: 50,
}

vi.mock('../components/RecursosCamasNav.vue', () => ({ default: { template: '<nav />' } }))
const resultado: ResultadoTransicion = {
  idCama: 101,
  estadoAnterior: 'Ocupada',
  estado: 'En limpieza',
  idAsignacionFinalizada: 50,
  fechaEgreso: '2026-11-15T13:00:00Z',
}
const boton = (wrapper: ReturnType<typeof mount>, texto: string) =>
  wrapper.findAll('button').find((b) => b.text() === texto)!
function crearApi(inicial: Cama = cama): CamasApi {
  return {
    listar: vi.fn().mockResolvedValue([inicial]),
    asignar: vi.fn(),
    transicionar: vi.fn().mockResolvedValue(resultado),
  }
}

describe('HU 2.1: controles por estado', () => {
  it.each([
    ['Libre', 'Bloquear por mantenimiento'],
    ['Ocupada', 'Liberar por alta o traslado'],
    ['En limpieza', 'Confirmar limpieza'],
    ['Bloqueada', 'Finalizar mantenimiento'],
  ] as const)('ofrece la operación correspondiente a %s', (estado, texto) => {
    const wrapper = mount(CamaCard, {
      props: {
        cama: {
          ...cama,
          estado,
          idAsignacionActiva: estado === 'Ocupada' ? 50 : null,
          disponible: estado === 'Libre',
        },
        deshabilitada: false,
      },
    })
    expect(boton(wrapper, texto).attributes('disabled')).toBeUndefined()
    expect(wrapper.classes()).toContain(`estado-${estado.toLowerCase().replace(' ', '-')}`)
    if (estado !== 'Libre') expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })
  it('no habilita liberación sin asignación identificada', () => {
    const wrapper = mount(CamaCard, {
      props: { cama: { ...cama, idAsignacionActiva: null }, deshabilitada: false },
    })
    expect(boton(wrapper, 'Liberar por alta o traslado').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })
  it('envía motivo e ID de la ocupación mostrada, sin solicitar un destino arbitrario', async () => {
    const wrapper = mount(TransicionCamaForm, {
      props: { cama, accion: 'liberar', enviando: false },
    })
    await wrapper.get('select').setValue('traslado')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('confirmar')?.[0]).toEqual([
      { accion: 'liberar', estadoEsperado: 'Ocupada', idAsignacion: 50, motivo: 'traslado' },
    ])
    wrapper.unmount()
  })
  it('no emite comandos mientras guarda', async () => {
    const wrapper = mount(TransicionCamaForm, {
      props: { cama, accion: 'liberar', enviando: true },
    })
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('confirmar')).toBeUndefined()
    wrapper.unmount()
  })
})

describe('HU 2.1: vista y servicio', () => {
  it('integra vista, formulario y cliente HTTP real al liberar', async () => {
    const responder = (datos: unknown) =>
      new Response(JSON.stringify(datos), {
        headers: { 'Content-Type': 'application/json' },
      })
    const solicitar = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(responder({ camas: [cama] }))
      .mockResolvedValueOnce(responder({ transicion: resultado }))
      .mockResolvedValueOnce(
        responder({ camas: [{ ...cama, estado: 'En limpieza', idAsignacionActiva: null }] }),
      )
    const wrapper = mount(GestionCamasView, {
      props: { api: crearCamasApi('/api/recursos-camas', solicitar) },
    })
    await flushPromises()
    await boton(wrapper, 'Liberar por alta o traslado').trigger('click')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(solicitar.mock.calls[1]?.[0]).toBe('/api/recursos-camas/camas/101/liberacion')
    expect(JSON.parse(String(solicitar.mock.calls[1]?.[1]?.body))).toEqual({
      estadoEsperado: 'Ocupada',
      idAsignacion: 50,
      motivo: 'alta',
    })
    expect(solicitar).toHaveBeenCalledTimes(3)
    expect(wrapper.get('[role="status"]').text()).toContain('En limpieza')
    expect(wrapper.get('article button').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })
  it('libera la ocupación y refresca desde la API', async () => {
    const api = crearApi()
    vi.mocked(api.listar)
      .mockResolvedValueOnce([cama])
      .mockResolvedValue([{ ...cama, estado: 'En limpieza', idAsignacionActiva: null }])
    const wrapper = mount(GestionCamasView, { props: { api } })
    await flushPromises()
    await boton(wrapper, 'Liberar por alta o traslado').trigger('click')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(api.transicionar).toHaveBeenCalledWith(101, {
      accion: 'liberar',
      estadoEsperado: 'Ocupada',
      idAsignacion: 50,
      motivo: 'alta',
    })
    expect(api.listar).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Ocupada → En limpieza')
    expect(boton(wrapper, 'Confirmar limpieza').exists()).toBe(true)
    wrapper.unmount()
  })
  it('un conflicto refresca sin habilitar Libre artificialmente', async () => {
    const api = crearApi({ ...cama, estado: 'En limpieza', idAsignacionActiva: null })
    api.transicionar = vi
      .fn()
      .mockRejectedValue(new ErrorCamasApi(409, 'El estado de la cama cambió.'))
    vi.mocked(api.listar)
      .mockResolvedValueOnce([{ ...cama, estado: 'En limpieza', idAsignacionActiva: null }])
      .mockResolvedValue([{ ...cama, estado: 'Bloqueada', idAsignacionActiva: null }])
    const wrapper = mount(GestionCamasView, { props: { api } })
    await flushPromises()
    await boton(wrapper, 'Confirmar limpieza').trigger('click')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('El estado de la cama cambió')
    expect(wrapper.text()).toContain('Bloqueada')
    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.get('article button').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })
  it('503: no muestra éxito ni reintenta el cambio', async () => {
    const api = crearApi()
    api.transicionar = vi.fn().mockRejectedValue(new ErrorCamasApi(503, 'Transacciones pendientes'))
    const wrapper = mount(GestionCamasView, { props: { api } })
    await flushPromises()
    await boton(wrapper, 'Liberar por alta o traslado').trigger('click')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Transacciones pendientes')
    expect(wrapper.find('.exito').exists()).toBe(false)
    expect(api.transicionar).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
  it.each<AccionCama>(['liberar', 'confirmar-limpieza', 'bloquear', 'finalizar-mantenimiento'])(
    'cliente HTTP: %s',
    async (accion) => {
      const rutas = {
        liberar: 'liberacion',
        'confirmar-limpieza': 'confirmacion-limpieza',
        bloquear: 'bloqueo',
        'finalizar-mantenimiento': 'fin-mantenimiento',
      }
      const solicitar = vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ transicion: resultado }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      const solicitud: SolicitudTransicion =
        accion === 'liberar'
          ? { accion, estadoEsperado: 'Ocupada', idAsignacion: 50, motivo: 'alta' }
          : { accion, estadoEsperado: 'En limpieza' }
      await crearCamasApi('/api/recursos-camas', solicitar).transicionar(101, solicitud)
      const opciones = solicitar.mock.calls[0]?.[1]
      expect(solicitar.mock.calls[0]?.[0]).toBe(`/api/recursos-camas/camas/101/${rutas[accion]}`)
      expect(opciones?.method).toBe('POST')
      expect(JSON.parse(String(opciones?.body))).not.toHaveProperty('idUsuario')
      expect(JSON.parse(String(opciones?.body))).not.toHaveProperty('accion')
    },
  )
})
