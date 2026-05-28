import { getToken } from '@/shared/lib/auth'
import { type ApiError } from '@/shared/lib/errorType'

// Orval serializes array params as a single comma-joined string (String(array)).
// ASP.NET [FromQuery] List<string> expects repeated params: ?a=1&a=2
function expandArrayParams(url: string): string {
  const qIdx = url.indexOf('?')
  if (qIdx === -1) return url
  const expanded = new URLSearchParams()
  new URLSearchParams(url.slice(qIdx + 1)).forEach((value, key) => {
    value.split(',').forEach(v => expanded.append(key, v))
  })
  return `${url.slice(0, qIdx)}?${expanded}`
}

async function serviceFetch<T>(
  gatewayPrefix: string,
  url: string,
  options?: RequestInit,
): Promise<T> {
  const token = getToken()
  const gatewayUrl = `${gatewayPrefix}${expandArrayParams(url).replace(/^\/api/, '')}`

  const response = await fetch(gatewayUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })

  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)

  const json = await response.json()

  if ('success' in json && !json.success) {
    const err = new Error(json.message ?? 'Request failed') as ApiError
    err.errorType = json.errorType
    throw err
  }

  return { data: json, status: response.status, headers: response.headers } as T
}

export const applicationFetch = <T>(url: string, options?: RequestInit) =>
  serviceFetch<T>('/api/application', url, options)

export const authFetch = <T>(url: string, options?: RequestInit) =>
  serviceFetch<T>('/api/security', url, options)

// alias kept for any remaining generated files referencing customFetch
export const customFetch = applicationFetch