/**
 * Contratos de datos estrictos para el módulo de Autenticación y Usuarios.
 * Cumple con el estándar de tipado estricto de punta a punta (cero any).
 */

// tipos compartidos para que formularios, stores y api usen la misma forma de autenticacion.
export interface User {
  id: string
  name: string
  email: string
  characterId?: string
  themeId?: string
  createdAt?: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
}

export interface AuthResponse {
  accessToken: string
  user: User
  message?: string
}

export interface ApiErrorResponse {
  error: string
  code?: string
  correlationId?: string
}

export interface DeviceSession {
  id: string
  userAgent: string | null
  createdAt: string
  lastUsedAt: string | null
  expiresAt: string
  isCurrent: boolean
}
