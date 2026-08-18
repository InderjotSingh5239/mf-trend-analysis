import axios, {
  AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios'

const configuredApiUrl =
  import.meta.env.VITE_API_BASE_URL?.trim()

// Single source of truth for the backend URL: VITE_API_BASE_URL.
// No hardcoded production backend URL lives in source — that was a
// real bug (see PROJECT_AUDIT.md item E): a stale fallback baked into
// the bundle can silently point production traffic at the wrong/dead
// backend even after the real URL changes. Only a local-dev
// convenience default is used, and only in dev builds.
if (!configuredApiUrl) {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.warn(
      '[api] VITE_API_BASE_URL is not set — defaulting to http://localhost:8000/api/v1 for local development. ' +
        'Set VITE_API_BASE_URL in frontend/.env.local to point at your backend.',
    )
  } else {
    // eslint-disable-next-line no-console
    console.error(
      '[api] VITE_API_BASE_URL is not set in this production build. ' +
        'All API requests will fail until it is configured in the deployment environment (e.g. Vercel project settings).',
    )
  }
}

export const API_BASE_URL = (
  configuredApiUrl ||
  (import.meta.env.DEV ? 'http://localhost:8000/api/v1' : '')
).replace(/\/+$/, '')

const ACCESS_TOKEN_KEY = 'mf_access_token'
const REFRESH_TOKEN_KEY = 'mf_refresh_token'

export const tokenStorage = {
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  },

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  },

  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  },

  clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  },
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use(
  (config) => {
    const token = tokenStorage.getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

function extractErrorMessage(error: AxiosError): string {
  const data = error.response?.data as
    | { detail?: unknown; message?: unknown }
    | undefined

  if (typeof data?.detail === 'string') return data.detail

  if (Array.isArray(data?.detail)) {
    const messages = data.detail
      .map((item) =>
        item && typeof item === 'object' && 'msg' in item
          ? String(item.msg)
          : null,
      )
      .filter((value): value is string => Boolean(value))

    if (messages.length) return messages.join('; ')
  }

  if (typeof data?.message === 'string') return data.message

  if (error.response?.status) {
    return `API request failed with status ${error.response.status}`
  }

  return error.message || 'Something went wrong'
}

let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStorage.getRefreshToken()
  if (!refreshToken) return null

  try {
    const response = await axios.post<{
      access_token: string
      token_type: string
    }>(
      `${API_BASE_URL}/auth/refresh`,
      { refresh_token: refreshToken },
      { timeout: 15_000 },
    )

    const newAccessToken = response.data.access_token
    if (!newAccessToken) throw new Error('Refresh endpoint returned no access token')

    tokenStorage.setTokens(newAccessToken, refreshToken)
    return newAccessToken
  } catch {
    tokenStorage.clearTokens()
    return null
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retried?: boolean })
      | undefined

    if (!original) {
      return Promise.reject(new Error(extractErrorMessage(error)))
    }

    const url = original.url ?? ''
    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh')

    if (
      error.response?.status === 401 &&
      !original._retried &&
      !isAuthEndpoint
    ) {
      original._retried = true

      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null
      })

      const newAccessToken = await refreshPromise

      if (newAccessToken) {
        original.headers.Authorization = `Bearer ${newAccessToken}`
        return apiClient(original)
      }

      tokenStorage.clearTokens()
      window.dispatchEvent(new CustomEvent('auth:session-expired'))
    }

    return Promise.reject(new Error(extractErrorMessage(error)))
  },
)
