import { useQuery } from '@tanstack/react-query'
import { getToken } from '@/shared/lib/auth'

async function fetchBiEmbed(url: string, token?: string): Promise<string> {
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  const data: { embedUrl?: string; data?: { embedUrl?: string } } = await res.json()
  const embedUrl = data.embedUrl ?? data.data?.embedUrl
  if (!embedUrl) throw new Error('embedUrl not found in response')
  return embedUrl
}

type State =
  | { status: 'loading' }
  | { status: 'ready'; embedUrl: string }
  | { status: 'error'; message: string }

export function useBiEmbed(url: string): State {
  const token = getToken()

  const { data: embedUrl, isLoading, isError, error } = useQuery({
    queryKey: ['bi-embed', url],
    queryFn:  () => fetchBiEmbed(url, token),
    staleTime: 30 * 1000,
    retry: 1,
  })

  if (isLoading) return { status: 'loading' }
  if (isError)   return { status: 'error', message: (error as Error).message }
  return { status: 'ready', embedUrl: embedUrl! }
}