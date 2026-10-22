import { useEffect, useState } from 'react'
import type { Resource } from './types'
import { resolveResource, resolveParams, peekCachedResource, type Context, type Fetcher } from './engine'

type Loaded<T> = { dataKey: string; fetchKey: string; rows: T[]; error: unknown }

const EMPTY: Loaded<never> = { dataKey: '', fetchKey: '', rows: [], error: null }

/**
 * Resuelve un resource → filas para la tabla. Cache en IndexedDB (O(1) tras el
 * primer fetch, sobrevive el refresh). Re-corre si cambia el resource o el context.
 *
 * Las filas quedan atadas a los params con que se pidieron: al cambiar de location nunca se
 * muestran las de OTRA location. Si la nueva ya está en cache se pinta en el mismo render
 * (SWR) y el request revalida detrás; si no, `loading` es true desde ese mismo render
 * (skeleton, sin un frame de "sin datos"). Un refresh con los mismos params conserva las
 * filas actuales mientras recarga.
 */
export function useTrxData<T = unknown>(resource: Resource | null, ctx: Context, fetcher: Fetcher, refreshKey = 0) {
  const [loaded, setLoaded] = useState<Loaded<T>>(EMPTY)
  // Keyea SOLO por los params que el recurso usa (location…). Cambiar categoría/skuPrefix
  // NO re-fetchea (esos son filtros client-side) → sin flash de skeleton por re-fetch inútil.
  const paramsKey = resource ? JSON.stringify(resolveParams(resource, ctx)) : ''
  const dataKey   = resource ? `${resource.id}|${paramsKey}` : ''
  const fetchKey  = `${dataKey}|${refreshKey}`

  useEffect(() => {
    if (!resource) { setLoaded(EMPTY); return }
    let cancelled = false
    const done = (rows: unknown, error: unknown = null) => {
      if (!cancelled) setLoaded({ dataKey, fetchKey, rows: Array.isArray(rows) ? (rows as T[]) : [], error })
    }
    // SWR: el 4º arg revalida en background → cuando llega lo fresco, actualiza la tabla sola.
    resolveResource(resource, ctx, fetcher, fresh => done(fresh))
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
