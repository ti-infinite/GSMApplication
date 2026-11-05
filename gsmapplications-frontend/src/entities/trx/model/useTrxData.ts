import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { Resource } from './types'
import { resolveResource, resolveParams, peekCachedResource, type Context, type Fetcher } from './engine'

type Loaded<T> = { dataKey: string; fetchKey: string; rows: T[]; error: unknown }

const EMPTY: Loaded<never> = { dataKey: '', fetchKey: '', rows: [], error: null }

export function useTrxData<T = unknown>(resource: Resource | null, ctx: Context, fetcher: Fetcher, refreshKey = 0) {
  const { t } = useTranslation(undefined, { keyPrefix: 'trx' })
  const [loaded, setLoaded] = useState<Loaded<T>>(EMPTY)
  const paramsKey = resource ? JSON.stringify(resolveParams(resource, ctx)) : ''
  const dataKey   = resource ? `${resource.id}|${paramsKey}` : ''
  const fetchKey  = `${dataKey}|${refreshKey}`

  useEffect(() => {
    if (!resource) { setLoaded(EMPTY); return }
    let cancelled = false
    const done = (rows: unknown, error: unknown = null) => {
      if (!cancelled) setLoaded({ dataKey, fetchKey, rows: Array.isArray(rows) ? (rows as T[]) : [], error })
    }
    const staleWarning = (err: unknown) => {
      console.error(`[useTrxData] revalidación de "${resource.id}" falló:`, err)
      if (!cancelled) toast.warning(t('staleData'), { id: `trx-stale-${resource.id}` })
    }
    resolveResource(resource, ctx, fetcher, fresh => done(fresh), staleWarning)
      .then(data => done(data))
      .catch(err => { console.error('[useTrxData] error resolviendo resource:', err); done([], err) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchKey])

  const sameData = !!resource && loaded.dataKey === dataKey
  // SWR: params nuevos con cache en memoria → se pinta ya, mientras el request revalida.
  const cached = !sameData && resource ? peekCachedResource(resource, ctx) : undefined
  return {
    rows:    sameData ? loaded.rows : Array.isArray(cached) ? (cached as T[]) : ([] as T[]),
    loading: !!resource && loaded.fetchKey !== fetchKey,
    error:   sameData ? loaded.error : null,
  }
}
