import { useQuery } from '@tanstack/react-query'
import { getToken } from '@/shared/lib/auth'
import { parseConfig, type MediaResource } from '@/shared/components/MediaPage'

type RawItem = {
  resourceCategory: string
  resourceOrder:    number
  config:           string
}

type ActivityResponseDto = {
  success:    boolean
  message:    string
  errorType?: string | null
  data:       RawItem[]
}

async function fetchActivity(token: string): Promise<MediaResource[]> {
  const res = await fetch(
    '/api/application/v1/Application/getMediaResources?categories=ACTIVITY&categories=NEWS',
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const response: ActivityResponseDto = await res.json()
  if (!response.success || !response.data) throw new Error(response.message)
  return response.data.map(r => ({ ...r, config: parseConfig(r.config) }))
}

type UseDashboardActivityResult = {
  activity: MediaResource[]
  news:     MediaResource[]
  loading:  boolean
}

export function useDashboardActivity(): UseDashboardActivityResult {
  const token = getToken()

  const { data = [], isLoading } = useQuery({
    queryKey: ['media-resources', 'ACTIVITY', 'NEWS'],
    queryFn:  () => fetchActivity(token),
    staleTime: 2 * 60 * 1000,
    enabled:  !!token,
  })

  return {
    activity: data.filter(r => r.resourceCategory.toUpperCase() === 'ACTIVITY'),
    news:     data.filter(r => r.resourceCategory.toUpperCase() === 'NEWS'),
    loading:  isLoading,
  }
}