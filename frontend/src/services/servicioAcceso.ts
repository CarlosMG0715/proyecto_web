import axios from 'axios'
import { api, renovarSesion } from '@/services/clienteHttp'
import { usarAlmacenSesion } from '@/stores/sesion'
import type {
  RespuestaErrorApi,
  RespuestaAcceso,
  CredencialesAcceso,
  DatosRegistro,
} from '@/types/acceso'

function extraerError(err: unknown, valorAlternativo: string): string {
  if (axios.isAxiosError<RespuestaErrorApi>(err)) {
    return err.response?.data?.error ?? valorAlternativo
  }
  return valorAlternativo
}

export async function login(credentials: CredencialesAcceso): Promise<void> {
  const session = usarAlmacenSesion()
  session.setLoading(true)
  session.setError(null)
  try {
    const { data } = await api.post<RespuestaAcceso>('/auth/login', credentials)
    session.guardarSesion(data.tokenAcceso, data.user)
  } catch (err) {
    session.setError(extraerError(err, 'No se pudo iniciar sesión'))
    throw err
  } finally {
    session.setLoading(false)
  }
}

export async function register(payload: DatosRegistro): Promise<void> {
  const session = usarAlmacenSesion()
  session.setLoading(true)
  session.setError(null)
  try {
    await api.post('/auth/register', payload)
  } catch (error) {
    session.setError(extraerError(error, 'No se pudo crear la cuenta'))
    throw error
  } finally {
    session.setLoading(false)
  }
}

// Una vez al cargar la app: recupera la sesión desde la cookie HttpOnly
export async function recuperarSesion(): Promise<void> {
  const session = usarAlmacenSesion()
  if (session.initialized) return
  try {
    await renovarSesion()
  } catch {
    session.limpiarSesion()
  } finally {
    session.setInitialized(true)
  }
}

export async function logout(): Promise<void> {
  // revoca la sesion en el servidor y limpia el estado local aunque falle la peticion.
  const session = usarAlmacenSesion()
  try {
    await api.post('/auth/logout')
  } finally {
    session.limpiarSesion()
  }
}
