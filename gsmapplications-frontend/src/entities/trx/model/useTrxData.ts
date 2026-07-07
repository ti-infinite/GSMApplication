import { useEffect, useState } from 'react'
import type { Resource } from './types'
import { resolveResource, type Context, type Fetcher } from './engine'

/**
 * Resuelve un resource → filas para la tabla. Cache en IndexedDB (O(1) tras el
 * primer fetch, sobrevive el refresh). Re-corre si cambia el resource o el context.
 */
export function useTrxData<T = unknown>(resource: Resource | null, ctx: Context, fetcher: Fetcher) {
  const [rows,    setRows]    = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const ctxKey = JSON.stringify(ctx)

  useEffect(() => {
    if (!resource) { setRows([]); return }
    let cancelled = false
    setLoading(true)
    resolveResource(resource, ctx, fetcher)
      .then(data => { if (!cancelled) setRows(Array.isArray(data) ? (data as T[]) : []) })
      .catch(err => { if (!cancelled) { console.error('[useTrxData] error resolviendo resource:', err); setRows([]) } })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource?.id, ctxKey])

  return { rows, loading }
}
