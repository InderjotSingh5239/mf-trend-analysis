import type { AuthSession, AuthUser, LoginPayload, RegisterPayload } from '@/types/auth'
import { apiClient, tokenStorage } from '@/api/client'

export class AuthError extends Error {}

interface ApiUserRead {
  id: string
  email: string
  full_name: string
  role: 'user' | 'admin' | 'analyst'
  is_active: boolean
  is_verified: boolean
}

interface ApiTokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

function adaptUser(api: ApiUserRead): AuthUser {
  return {
    id: api.id,
    email: api.email,
    fullName: api.full_name,
    role: api.role,
    isActive: api.is_active,
    isVerified: api.is_verified,
  }
}

export async function register(payload: RegisterPayload): Promise<AuthSession> {
  try {
    await apiClient.post<ApiUserRead>('/auth/register', {
      email: payload.email,
      password: payload.password,
      full_name: payload.fullName,
    })
  } catch (err) {
    throw new AuthError(err instanceof Error ? err.message : 'Could not create your account.')
  }

  // The register endpoint doesn't return tokens — log in immediately after
  // creating the account so the caller gets a fully signed-in session.
  return login({ email: payload.email, password: payload.password })
}

export async function login(payload: LoginPayload): Promise<AuthSession> {
  let tokens: ApiTokenResponse
  try {
    const { data } = await apiClient.post<ApiTokenResponse>('/auth/login', payload)
    tokens = data
  } catch (err) {
    throw new AuthError(err instanceof Error ? err.message : 'Invalid email or password.')
  }

  tokenStorage.setTokens(tokens.access_token, tokens.refresh_token)

  const user = await fetchCurrentUser()
  if (!user) {
    tokenStorage.clearTokens()
    throw new AuthError('Signed in, but could not load your profile. Please try again.')
  }

  return {
    user,
    tokens: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenType: tokens.token_type,
    },
  }
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  if (!tokenStorage.getAccessToken()) return null
  try {
    const { data } = await apiClient.get<ApiUserRead>('/users/me')
    return adaptUser(data)
  } catch {
    return null
  }
}

export function logout(): void {
  tokenStorage.clearTokens()
}
