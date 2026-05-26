import { useState, useEffect } from 'react'
import Cookies from 'js-cookie'
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

type UseDashboardActivityResult = {
  activity: MediaResource[]
  news:     MediaResource[]
  loading:  boolean
}

export function useDashboardActivity(): UseDashboardActivityResult {
  const token = Cookies.get('gsm_token') ?? ''

  const [activity, setActivity] = useState<MediaResource[]>([])
  const [news,     setNews]     = useState<MediaResource[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    async function fetch_() {
      try {
        const res = await fetch(
          '/api/application/v1/Application/getMediaResources?categories=ACTIVITY&categories=NEWS',
          { headers: { Authorization: `Bearer ${token}` } }
        )
        const response: ActivityResponseDto = await res.json()
        if (!response.success || !response.data) return

        const parsed = response.data.map(r => ({ ...r, config: parseConfig(r.config) }))
        setActivity(parsed.filter(r => r.resourceCategory.toUpperCase() === 'ACTIVITY'))
        setNews(parsed.filter(r => r.resourceCategory.toUpperCase() === 'NEWS'))
      } finally {
        setLoading(false)
      }
    }
    fetch_()
  }, [token])

  return { activity, news, loading }
}