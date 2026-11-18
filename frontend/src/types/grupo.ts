export interface MiembroGrupo {
  id: string
  name: string
  idPersonaje: string
  idTema: string
  role: 'ADMIN' | 'MIEMBRO'
  caidoEn: string | null
  mensajeHoy: string
  completadosHoy: number
  diasSinCumplir: number
}
export interface HabitoGrupo {
  insignia: string
  mensajesHoy: { idUsuario: string; mensaje: string }[]
  id: string
  name: string
  description: string | null
  diasMeta: number
  completadoPor: string[]
}
export interface MensajeChat {
  id: string
  content: string
  type: 'USER' | 'SYSTEM'
  creadoEn: string
  author: { id: string; name: string; idPersonaje: string } | null
}
export interface Grupo {
  descripcion: string
  creadoEn: string
  id: string
  name: string
  color: string
  codigoInvitacion: string
  today: string
  streak: number
  members: MiembroGrupo[]
  habits: HabitoGrupo[]
  messages: MensajeChat[]
  history: { date: string; percent: number; penalty: boolean }[]
}
export interface DatosGrupo {
  descripcion?: string
  primerHabito?: DatosHabito
  name: string
  color: string
}
export interface DatosHabito {
  insignia?: string
  name: string
  description: string
  diasMeta?: number
}
