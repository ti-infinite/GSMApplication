import { saveResource, getResource } from '@/shared/lib/idb'
import { getValueByPath } from '@/shared/lib/pathResolver'
import { operationsFetch } from '@/shared/lib/fetcher'
import { DEFAULT_VALUE_SOURCES } from './valueSources'
import type { Resource, ResourceParameter, ApiEnvelope, TrxItem } from './types'

/** Contexto runtime (location, category, inputs…) — las variables en uso. */
export type Context = Record<string, unknown>

/** Función que "pega" al backend. Mockeable en el proto, real en producción.
 *  Recibe el `resource` para poder leer su `endpoint` (fetcher genérico). */
export type Fetcher = (process: string, params: Record<string, string>, resource?: Resource) => Promise<ApiEnvelope<unknown>>

// El valor de un param sale del MISMO `sourceType` que las columnas (DEFAULT_VALUE_SOURCES,
// única definición de CONTEXT/COOKIE/…): la fuente da el BASE y el path (`value`) navega.
// STATIC es literal (no es un lookup). Fuentes no registradas (ROW/INPUT) caen al context.
// `value` es el campo actual; `keyValue` es su alias legacy.
function resolveParam(param: ResourceParameter, ctx: Context): string {
  const path = param.values?.[0] ?? param.value ?? param.keyValue ?? param.key
  if (param.sourceType === 'STATIC') return String(param.values?.[0] ?? param.value ?? param.keyValue ?? '')
  const src  = DEFAULT_VALUE_SOURCES[param.sourceType ?? 'CONTEXT']
  const base = src ? src({ row: {}, context: ctx as Record<string, string> }) : ctx
  return String(getValueByPath(base, path) ?? '')
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
// Resuelve los params del resource (location…) contra el context. Exportado para que
// useTrxData keye el re-fetch SOLO por lo que el recurso usa (no por todo el context →
// cambiar categoría/skuPrefix no re-fetchea LOADCS).
export function resolveParams(resource: Resource, ctx: Context): Record<string, string> {
  const params: Record<string, string> = {}
  for (const p of resource.parameters) params[p.key] = resolveParam(p, ctx)
  return params
}

export async function resolveResource(
  resource: Resource, ctx: Context, fetcher: Fetcher,
  onRevalidate?: (data: unknown) => void,   // SWR: recibe lo FRESCO cuando el resource cachea y ya se devolvió el cache
): Promise<unknown> {
  const params = resolveParams(resource, ctx)
  const useCache = resource.cacheIn === 'INDEXED_DB'
  const key      = cacheKey(resource, params)

  const fetchFresh = async (): Promise<unknown> => {
    const envelope = await fetcher(resource.id, params, resource)
    if (envelope.success !== 'true') {
      throw new Error(envelope.message || `Error en resource "${resource.id}"`)
    }
    if (useCache) await saveResource(key, envelope.data)
    return envelope.data
  }

  // SWR GENÉRICO — para CUALQUIER resource con `cacheIn` (por su config, no por su id: LOADC,
  // LOADCS, lo que sea): devuelve el cache YA y revalida en background → onRevalidate recibe lo
  // fresco y la tabla se re-organiza sola si cambió. Los resources sin cacheIn fetchean directo.
  if (useCache) {
    const cached = await getResource(key)
    if (cached != null) {
      if (onRevalidate) void fetchFresh().then(onRevalidate).catch(() => {})
      return cached
    }
  }

  return fetchFresh()
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
  // Ruta del executor genérico por id, en UN solo lugar (si se renombra, se cambia
  // acá y ya). El {id} es el resourceEvent → el backend elige el SP. Un resource
  // puede overridear con `endpoint`. Los params van como body (POST).
  const template = resource?.endpoint ?? '/api/v1/Operations/execute-trxResource/{id}'
  const path     = template.replace('{id}', id)
  const res  = await operationsFetch<{ data: ApiEnvelope<unknown> }>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  const body = res.data
  return {
    success: String(body?.success ?? 'false'),
    message: body?.message ?? '',
    data:    body?.data ?? [],
    traceId: body?.traceId ?? null,
  }
}
