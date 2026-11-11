// funciones de autenticacion que convierten los formularios en peticiones a la api.
import axios from 'axios'
import { api, refreshSession } from '@/services/api'
import { useSessionStore } from '@/stores/session'
import type {
  ApiErrorResponse,
  AuthResponse,
  DeviceSession,
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

export interface RegisterResult {
  verificationSent: boolean
  verificationRequired?: boolean
}

export async function register(payload: RegisterPayload): Promise<RegisterResult> {
  // registra la cuenta; esta funcion no inicia sesion automaticamente.
  const session = useSessionStore()
  session.setLoading(true)
  session.setError(null)
  try {
    const { data } = await api.post<RegisterResult>('/auth/register', payload)
    return data
  } catch (err) {
    session.setError(extractError(err, 'No se pudo crear la cuenta'))
    throw err
  } finally {
    session.setLoading(false)
  }
}

export function requiresEmailVerification(error: unknown): boolean {
  return axios.isAxiosError<ApiErrorResponse>(error) && error.response?.data?.code === 'EMAIL_VERIFICATION_REQUIRED'
}

export async function resendVerification(credentials: LoginCredentials): Promise<void> {
  try {
    await api.post('/auth/resend-verification', credentials)
  } catch (error) {
    throw new Error(extractError(error, 'No pudimos reenviar el correo.'))
  }
}

export async function verifyEmail(token: string): Promise<void> {
  try {
    await api.post('/auth/verify-email', { token })
  } catch (error) {
    throw new Error(extractError(error, 'No pudimos confirmar el correo. Inténtalo de nuevo.'))
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

export async function fetchSessions(): Promise<DeviceSession[]> {
  const { data } = await api.get<{ sessions: DeviceSession[] }>('/auth/sessions')
  return data.sessions
}

export async function revokeSession(sessionId: string): Promise<void> {
  await api.delete(`/auth/sessions/${encodeURIComponent(sessionId)}`)
}

export async function logoutAllDevices(password: string): Promise<void> {
  await api.post('/auth/logout-all', { password })
  useSessionStore().clearSession()
}
