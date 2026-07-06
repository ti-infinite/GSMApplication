import { saveResource, getResource } from '@/shared/lib/idb'
import { getValueByPath } from '@/shared/lib/pathResolver'
import type { Resource, ResourceParameter, ApiEnvelope, TrxItem } from './types'

/** Contexto runtime (location, category, inputs…) — las variables en uso. */
export type Context = Record<string, unknown>

/** Función que "pega" al backend. Mockeable en el proto, real en producción. */
export type Fetcher = (process: string, params: Record<string, string>) => Promise<ApiEnvelope<unknown>>

function resolveParam(param: ResourceParameter, ctx: Context): string {
  switch (param.sourceType) {
    case 'STATIC':  return String(param.keyValue ?? '')
    case 'CONTEXT': return String(ctx[param.keyValue ?? param.key] ?? '')
    // COOKIE / ROW / INPUT: en el proto ya vienen resueltos en el context.
    default:        return String(ctx[param.key] ?? '')
  }
}

// Cache key = resourceId + params → "LOADCS::location=BOS". Cada location cachea
// aparte: cambiar de finca re-fetchea sin pisar lo anterior (vuelve instantáneo).
function cacheKey(resource: Resource, params: Record<string, string>): string {
  const query = new URLSearchParams(params).toString()
  return query ? `${resource.id}::${query}` : resource.id
}

/**
 * Resuelve un resource: resuelve params → cache primero (IndexedDB, por
 * resource+params); si no está → fetcher → desempaca el envelope → guarda `data`
 * en IndexedDB → lo devuelve.
 */
export async function resolveResource(resource: Resource, ctx: Context, fetcher: Fetcher): Promise<unknown> {
  const params: Record<string, string> = {}
  for (const p of resource.parameters) params[p.key] = resolveParam(p, ctx)

  const key    = cacheKey(resource, params)
  const cached = await getResource(key)
  if (cached != null) return cached

  const envelope = await fetcher(resource.id, params)
  if (envelope.success !== 'true') {
    throw new Error(envelope.message || `Error en resource "${resource.id}"`)
  }

  await saveResource(key, envelope.data)
  return envelope.data
}

/** Extrae el valor de un item (columna) sobre la data — con el resolver nativo. */
export function resolveItemValue(data: unknown, item: TrxItem): unknown {
  return getValueByPath(data, item.selectorValue)
}
