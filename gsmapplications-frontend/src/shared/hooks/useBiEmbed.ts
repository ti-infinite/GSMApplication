import { useState, useEffect } from 'react'
import i18n from 'i18next'
import { getStoredUser } from '@/shared/lib/auth'
import { useGetApiRuleById } from '@/shared/api/application/integrations/integrations'
import { execApi } from '@/shared/api/operations/integrations/integrations'
import type { ApiRuleApiResponse } from '@/shared/api/application/model'
import type { ObjectApiResponse } from '@/shared/api/operations/model'

type State =
  | { status: 'loading' }
  | { status: 'ready'; embedUrl: string }
  | { status: 'error'; message: string }

const BI_RULE_ID        = 1
const BI_PASSWORD       = '12345'
const TOKEN_LIFETIME_MS = 15 * 60 * 1000
const REFRESH_MARGIN_MS =  1 * 60 * 1000
const CACHE_KEY         = 'gsm_bi_embed'

type CachedEmbed = { embedUrl: string; expiresAt: number }

function readCache(): CachedEmbed | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CachedEmbed
  } catch { return null }
}

function writeCache(embedUrl: string): CachedEmbed {
  const entry: CachedEmbed = { embedUrl, expiresAt: Date.now() + TOKEN_LIFETIME_MS }
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry)) } catch {}
  return entry
}

function resolveEmbedUrl(data: unknown, reportBaseUrl?: string): string | null {
  if (typeof data === 'string') {
    if (data.startsWith('http')) return data
    if (data.length > 0 && reportBaseUrl)
      return `${reportBaseUrl.replace(/\/$/, '')}/${data}`
  }
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    const url = obj['embedUrl'] ?? obj['EmbedUrl'] ?? obj['url'] ?? obj['Url']
    if (typeof url === 'string' && url.startsWith('http')) return url
    const token = obj['token'] ?? obj['Token'] ?? obj['access_token'] ?? obj['AccessToken']
    if (typeof token === 'string' && reportBaseUrl)
      return `${reportBaseUrl.replace(/\/$/, '')}/${token}`
  }
  return null
}

export function useBiEmbed(reportBaseUrl?: string): State {
  const cached = readCache()
  const [state, setState] = useState<State>(
    cached && Date.now() < cached.expiresAt - REFRESH_MARGIN_MS
      ? { status: 'ready', embedUrl: cached.embedUrl }
      : { status: 'loading' }
  )

  const { data: rule, isSuccess, isError } = useGetApiRuleById(BI_RULE_ID, {
    query: {
      select: (res) => (res.data as ApiRuleApiResponse).data,
      staleTime: TOKEN_LIFETIME_MS,
    },
  })

  useEffect(() => {
    if (isError) {
      setState({ status: 'error', message: i18n.t('biEmbed.ruleNotFound') })
      return
    }
    if (!isSuccess || !rule?.urlEndPoint) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout>

    // silent = true → no muestra loading, el iframe sigue visible
    const fetchToken = async (silent: boolean) => {
      try {
        const res = await execApi({
          urlEndPoint: rule.urlEndPoint!,
          operation:   rule.operation ?? 'GET',
          headers:     {},
          parameters:  {},
          body:        { User: getStoredUser()?.username ?? '', Pass: BI_PASSWORD },
        })

        if (cancelled) return

        const payload  = (res.data as ObjectApiResponse).data
        const embedUrl = resolveEmbedUrl(payload, reportBaseUrl)
        if (!embedUrl) throw new Error(i18n.t('biEmbed.invalidUrl'))

        const entry = writeCache(embedUrl)
        setState({ status: 'ready', embedUrl })  // actualiza URL sin parpadeo

        const ms = entry.expiresAt - Date.now() - REFRESH_MARGIN_MS
        timer = setTimeout(() => fetchToken(true), ms)  // siguiente refresh silencioso
      } catch (err: unknown) {
        if (!cancelled && !silent)
          setState({ status: 'error', message: (err as Error).message })
        // refresh silencioso fallido → iframe sigue con URL vieja hasta que el usuario navega
      }
    }

    const cached = readCache()
    const msUntilExpiry = cached ? cached.expiresAt - Date.now() - REFRESH_MARGIN_MS : 0

    if (cached && msUntilExpiry > 0) {
      // Caché válido — solo programa refresh silencioso
      timer = setTimeout(() => fetchToken(true), msUntilExpiry)
    } else {
      // Primera carga o caché expirado
      fetchToken(false)
    }

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [isSuccess, isError, rule, reportBaseUrl])

  return state
}

export function clearBiEmbedCache() {
  try { sessionStorage.removeItem(CACHE_KEY) } catch {}
}