import { useEffect, useState } from 'react'
import type { Resource } from './types'
import { resolveResource, resolveParams, type Context, type Fetcher } from './engine'

/**
 * Resuelve un resource → filas para la tabla. Cache en IndexedDB (O(1) tras el
 * primer fetch, sobrevive el refresh). Re-corre si cambia el resource o el context.
 */
export function useTrxData<T = unknown>(resource: Resource | null, ctx: Context, fetcher: Fetcher, refreshKey = 0) {
  const [rows,    setRows]    = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<unknown>(null)
  // Keyea SOLO por los params que el recurso usa (location…). Cambiar categoría/skuPrefix
  // NO re-fetchea (esos son filtros client-side) → sin flash de skeleton por re-fetch inútil.
  const paramsKey = resource ? JSON.stringify(resolveParams(resource, ctx)) : ''

  useEffect(() => {
    if (!resource) { setRows([]); setError(null); return }
    let cancelled = false
    setLoading(true); setError(null)
    // SWR: el 4º arg revalida en background → cuando llega lo fresco, actualiza la tabla sola.
    resolveResource(resource, ctx, fetcher, fresh => { if (!cancelled) setRows(Array.isArray(fresh) ? (fresh as T[]) : []) })
      .then(data => { if (!cancelled) setRows(Array.isArray(data) ? (data as T[]) : []) })
      .catch(err => { if (!cancelled) { console.error('[useTrxData] error resolviendo resource:', err); setRows([]); setError(err) } })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource?.id, paramsKey, refreshKey])

  return { rows, loading, error }
}
