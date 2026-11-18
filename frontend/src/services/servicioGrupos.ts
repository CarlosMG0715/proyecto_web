// Peticiones HTTP de grupos. No contiene reglas de negocio: esas se validan en el backend.
import { api } from './clienteHttp'
import type { Grupo, DatosGrupo, DatosHabito } from '@/types/grupo'
const path = (id: string) => `/groups/${encodeURIComponent(id)}`
export const servicioGrupos = {
  async listarGrupos(): Promise<Grupo[]> {
    return (await api.get<Grupo[]>('/groups')).data
  },
  async obtenerGrupo(id: string): Promise<Grupo> {
    return (await api.get<Grupo>(path(id))).data
  },
  async crearGrupo(input: DatosGrupo): Promise<Grupo> {
    return (await api.post<Grupo>('/groups', input)).data
  },
  async unirseAlGrupo(code: string): Promise<Grupo> {
    return (await api.post<Grupo>('/groups/join', { code })).data
  },
  async actualizarGrupo(id: string, input: DatosGrupo) {
    await api.patch(path(id), input)
  },
  async eliminarGrupo(id: string) {
    await api.delete(path(id))
  },
  async salirDelGrupo(id: string) {
    await api.delete(`${path(id)}/membership`)
  },
  async quitarIntegrante(id: string, idMiembro: string) {
    await api.delete(`${path(id)}/members/${encodeURIComponent(idMiembro)}`)
  },
  async reiniciarPersonaje(id: string, idMiembro?: string) {
    const destino = idMiembro
      ? `${path(id)}/members/${encodeURIComponent(idMiembro)}/revive`
      : `${path(id)}/revive`
    await api.post(destino)
  },
  async guardarHabito(id: string, input: DatosHabito, idHabito?: string) {
    if (idHabito)
      await api.patch(
        `${path(id)}/habits/${encodeURIComponent(idHabito)}`,
        input,
      )
    else await api.post(`${path(id)}/habits`, input)
  },
  async eliminarHabito(id: string, idHabito: string) {
    await api.delete(`${path(id)}/habits/${encodeURIComponent(idHabito)}`)
  },
  async marcarHabito(id: string, idHabito: string, completed: boolean) {
    await api.put(
      `${path(id)}/habits/${encodeURIComponent(idHabito)}/check-in`,
      { completed },
    )
  },
  async registrarCheckGrupal(id: string, idHabitos: string[], mensaje: string) {
    await api.post(path(id) + '/check', { idHabitos, mensaje })
  },
  async enviarMensaje(id: string, content: string) {
    await api.post(`${path(id)}/messages`, { content })
  },
}
