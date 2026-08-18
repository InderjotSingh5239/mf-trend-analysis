export interface AuthUser {
  id: string
  email: string
  fullName: string
  role: 'user' | 'admin'
  isActive: boolean
  isVerified: boolean
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  tokenType: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  email: string
  password: string
  fullName: string
}

export interface AuthSession {
  user: AuthUser
  tokens: AuthTokens
}
