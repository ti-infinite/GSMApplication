import { isSessionActive } from '@/shared/lib/auth'
import { parseConfig, type MediaResource } from '@/shared/lib/mediaConfig'
import { useGetMediaResources } from '@/shared/api/application/application/application'
import type { MultimediaResourceDtoListApiResponse } from '@/shared/api/application/model'

type UseDashboardActivityResult = {
  activity: MediaResource[]
  news:     MediaResource[]
  loading:  boolean
  isError:  boolean
  error:    unknown
  refetch:  () => void
}

export function useDashboardActivity(): UseDashboardActivityResult {
  const { data = [], isLoading, isError, error, refetch } = useGetMediaResources(
    { categories: ['ACTIVITY', 'NEWS'] },
    {
      query: {
        staleTime: 2 * 60 * 1000,
        enabled:   isSessionActive(),
        select: (response) => ((response.data as MultimediaResourceDtoListApiResponse).data ?? []).map(r => ({
          resourceCategory: r.resourceCategory ?? '',
          resourceOrder:    r.resourceOrder    ?? 0,
          config:           parseConfig(r.config ?? ''),
        })),
      },
    },
  )

  return {
    activity: data.filter(r => r.resourceCategory.toUpperCase() === 'ACTIVITY'),
    news:     data.filter(r => r.resourceCategory.toUpperCase() === 'NEWS'),
    loading:  isLoading,
    isError,
    error,
    refetch,
  }
}