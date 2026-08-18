import type {
  AuthSession,
  AuthTokens,
  AuthUser,
  LoginPayload,
  RegisterPayload,
} from '@/types/auth'
import { apiClient, tokenStorage } from '@/api/client'

interface ApiUser {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'analyst' | 'user'
  is_active: boolean
  is_verified: boolean
  created_at: string
}

interface ApiTokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

function mapUser(user: ApiUser): AuthUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    role: user.role === 'admin' ? 'admin' : 'user',
    isActive: user.is_active,
    isVerified: user.is_verified,
  }
}

function mapTokens(tokens: ApiTokenResponse): AuthTokens {
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    tokenType: tokens.token_type,
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

export async function register(
  payload: RegisterPayload,
): Promise<AuthSession> {
  try {
    await apiClient.post<ApiUser>('/auth/register', {
      email: payload.email,
      password: payload.password,
      full_name: payload.fullName,
    })

    return login({
      email: payload.email,
      password: payload.password,
    })
  } catch (error) {
    throw new AuthError(
      error instanceof Error ? error.message : 'Registration failed',
    )
  }
}

export async function login(
  payload: LoginPayload,
): Promise<AuthSession> {
  try {
    const { data: tokenData } =
      await apiClient.post<ApiTokenResponse>(
        '/auth/login',
        payload,
      )

    const tokens = mapTokens(tokenData)
    tokenStorage.setTokens(
      tokens.accessToken,
      tokens.refreshToken,
    )

    const { data: userData } =
      await apiClient.get<ApiUser>('/users/me')

    return {
      user: mapUser(userData),
      tokens,
    }
  } catch (error) {
    tokenStorage.clearTokens()
    throw new AuthError(
      error instanceof Error ? error.message : 'Login failed',
    )
  }
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  if (!tokenStorage.getAccessToken()) return null

  try {
    const { data } =
      await apiClient.get<ApiUser>('/users/me')

    return mapUser(data)
  } catch {
    tokenStorage.clearTokens()
    return null
  }
}

export function logout(): void {
  tokenStorage.clearTokens()
}
