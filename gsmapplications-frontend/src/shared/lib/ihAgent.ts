import { env } from '@/shared/config/env'

const API_KEY = env.ihApiKey

export function ihFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const isFormData = init.body instanceof FormData
  return fetch(`/ih-api${path}`, {
    ...init,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...init.headers,
      'X-API-Key': API_KEY,
    },
  })
}
