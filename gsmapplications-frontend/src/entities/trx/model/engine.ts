import { saveResource, getResource } from '@/shared/lib/idb'
import { getValueByPath } from '@/shared/lib/pathResolver'
import { operationsFetch } from '@/shared/lib/fetcher'
import type { Resource, ResourceParameter, ApiEnvelope, TrxItem } from './types'

/** Contexto runtime (location, category, inputs…) — las variables en uso. */
export type Context = Record<string, unknown>

/** Función que "pega" al backend. Mockeable en el proto, real en producción.
 *  Recibe el `resource` para poder leer su `endpoint` (fetcher genérico). */
export type Fetcher = (process: string, params: Record<string, string>, resource?: Resource) => Promise<ApiEnvelope<unknown>>

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

  // Solo cachea si el resource lo pide (cacheIn: 'INDEXED_DB'). Los que leen data
  // VIVA (ej. inventario) omiten cacheIn → siempre re-resuelven (consistente).
  const useCache = resource.cacheIn === 'INDEXED_DB'
  const key      = cacheKey(resource, params)
  if (useCache) {
    const cached = await getResource(key)
    if (cached != null) return cached
  }

  const envelope = await fetcher(resource.id, params, resource)
  if (envelope.success !== 'true') {
    throw new Error(envelope.message || `Error en resource "${resource.id}"`)
  }

  if (useCache) await saveResource(key, envelope.data)
  return envelope.data
}

/** Extrae el valor de un item (columna) sobre la data — con el resolver nativo. */
export function resolveItemValue(data: unknown, item: TrxItem): unknown {
  return getValueByPath(data, item.selectorValue)
}

/**
 * Fetcher genérico: usa el MISMO mutator que orval (operationsFetch), pero con la
 * URL que viene del JSON (resource.endpoint) + los params resueltos. Sirve para
 * cualquier endpoint "limpio" → el backend agrega rutas sin tocar el front. Los
 * casos que necesitan transform usan un fetcher custom registrado por id.
 */
export const httpFetcher: Fetcher = async (_process, params, resource) => {
  const id       = resource?.id ?? ''
  // Endpoint = template; {id} es el proceso. Default: el dispatch único /Resources/{id}
  // → el backend elige el SP por el id. Un resource puede overridear con otra ruta.
  const template = resource?.endpoint ?? '/api/v1/Resources/{id}'
  const path     = template.replace('{id}', id)
  const qs  = new URLSearchParams(params).toString()
  const url = `${path}${qs ? `?${qs}` : ''}`
  const res  = await operationsFetch<{ data: ApiEnvelope<unknown> }>(url)
  const body = res.data
  return {
    success: String(body?.success ?? 'false'),
    message: body?.message ?? '',
    data:    body?.data ?? [],
    traceId: body?.traceId ?? null,
  }
}
