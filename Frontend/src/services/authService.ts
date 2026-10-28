// funciones de autenticacion que convierten los formularios en peticiones a la api.
import axios from 'axios'
import { api, refreshSession } from '@/services/api'
import { useSessionStore } from '@/stores/session'
import type {
  ApiErrorResponse,
  AuthResponse,
  LoginCredentials,
  RegisterPayload,
} from '@/types/auth'

function extractError(err: unknown, fallback: string): string {
  // usa el mensaje del servidor si existe; si no, muestra el texto alternativo.
  if (axios.isAxiosError<ApiErrorResponse>(err)) {
    return err.response?.data?.error ?? fallback
  }
  return fallback
}

export async function login(credentials: LoginCredentials): Promise<void> {
  // inicia sesion y guarda en pinia el token y los datos basicos de la cuenta.
  const session = useSessionStore()
  session.setLoading(true)
  session.setError(null)
  try {
    const { data } = await api.post<AuthResponse>('/auth/login', credentials)
    session.setSession(data.accessToken, data.user)
  } catch (err) {
    session.setError(extractError(err, 'No se pudo iniciar sesión'))
    throw err
  } finally {
    session.setLoading(false)
  }
}

export async function register(payload: RegisterPayload): Promise<void> {
  // registra la cuenta; esta funcion no inicia sesion automaticamente.
  const session = useSessionStore()
  session.setLoading(true)
  session.setError(null)
  try {
    await api.post('/auth/register', payload)
  } catch (err) {
    session.setError(extractError(err, 'No se pudo crear la cuenta'))
    throw err
  } finally {
    session.setLoading(false)
  }
}

// Una vez al cargar la app: recupera la sesión desde la cookie HttpOnly
export async function bootstrap(): Promise<void> {
  // recupera una sesion anterior usando la cookie http only.
  const session = useSessionStore()
  if (session.initialized) return
  try {
    await refreshSession()
  } catch {
    session.clearSession()
  } finally {
    session.setInitialized(true)
  }
}

export async function logout(): Promise<void> {
  // revoca la sesion en el servidor y limpia el estado local aunque falle la peticion.
  const session = useSessionStore()
  try {
    await api.post('/auth/logout')
  } finally {
    session.clearSession()
  }
}
