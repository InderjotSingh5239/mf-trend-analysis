import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

// Canonical, single API client for the whole app. Every service in
// src/services/*.ts imports `apiClient` from here — there is no other axios
// instance anywhere in the frontend. Points at the FastAPI backend's
// versioned API root, e.g. http://localhost:8000/api/v1 (matches the
// backend's API_V1_PREFIX setting). Falls back to a same-origin relative
// path when unset, for deployments that proxy /api/v1 to the backend from
// the same domain (see vercel.json rewrites).
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

const ACCESS_TOKEN_KEY = 'mf_access_token'
const REFRESH_TOKEN_KEY = 'mf_refresh_token'

export const tokenStorage = {
  getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  },
  clearTokens: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  },
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/**
 * FastAPI's error body shape varies by failure type:
 *  - HTTPException(detail="some message")            -> { detail: "some message" }
 *  - RequestValidationError (422)                     -> { detail: [{ msg, loc, type, ... }, ...] }
 * Naively rendering `error.response.data.detail` when it's an array produces
 * "[object Object],[object Object]" in the UI — this normalizes both shapes
 * into a single human-readable string.
 */
function extractErrorMessage(error: AxiosError): string {
  const data = error.response?.data as { detail?: unknown; message?: string } | undefined
  const detail = data?.detail

  if (typeof detail === 'string') return detail

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => (item && typeof item === 'object' && 'msg' in item ? String(item.msg) : null))
      .filter((msg): msg is string => Boolean(msg))
    if (messages.length) return messages.join('; ')
  }

  return data?.message || error.message || 'Something went wrong'
}

let refreshPromise: Promise<string | null> | null = null

/**
 * Calls POST /auth/refresh directly via a bare axios instance (not
 * `apiClient`) so the request/response interceptors above don't recurse.
 */
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStorage.getRefreshToken()
  if (!refreshToken) return null

  try {
    // Note: POST /auth/refresh returns only a new access_token — the
    // backend does not rotate the refresh token on refresh, so the
    // existing refresh token in storage stays valid and must be kept.
    const { data } = await axios.post<{ access_token: string; token_type: string }>(
      `${API_BASE_URL}/auth/refresh`,
      { refresh_token: refreshToken }
    )
    tokenStorage.setTokens(data.access_token, refreshToken)
    return data.access_token
  } catch {
    tokenStorage.clearTokens()
    return null
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined
    const isAuthEndpoint = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/register')

    if (error.response?.status === 401 && original && !original._retried && !isAuthEndpoint) {
      original._retried = true

      // De-duplicate concurrent refresh attempts: multiple requests failing
      // with 401 at once should trigger exactly one refresh call.
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null
      })

      const newAccessToken = await refreshPromise
      if (newAccessToken) {
        original.headers = original.headers ?? {}
        original.headers.Authorization = `Bearer ${newAccessToken}`
        return apiClient(original)
      }

      // Refresh failed — clear the session and let the caller (AuthContext)
      // react to the rejected promise by redirecting to /login.
      tokenStorage.clearTokens()
      window.dispatchEvent(new CustomEvent('auth:session-expired'))
    }

    return Promise.reject(new Error(extractErrorMessage(error)))
  }
)
