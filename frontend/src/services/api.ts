/**
 * Backwards-compatible API service export.
 * All requests use the single configured Axios client.
 */
export {
  API_BASE_URL,
  apiClient,
  tokenStorage,
} from '@/api/client'
