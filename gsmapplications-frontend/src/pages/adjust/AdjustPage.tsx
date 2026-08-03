import { buildRegistry, TrxModule } from '@/entities/trx'
import type { Fetcher } from '@/entities/trx'
import { getCategories, getMasterProducts } from '@/shared/api/operations/endpoints'
import type { StringApiResponse, MasterProductDTOListApiResponse } from '@/shared/api/operations/model'
import { getFilteredLocations } from '@/shared/api/application/endpoints'
import type { LocationDTOListApiResponse } from '@/shared/api/application/model'

const PREFIX = 'AJT'
const num = (v: unknown) => Number(v ?? 0) || 0

/* ───────────────────────────────────────────────────────────────────────────
 * REGISTRY del módulo — lo ESPECÍFICO. Genéricos (renderers/guards/createTrx) de
 * buildRegistry. El CONFIG (JsonFront/REA/Workflow) vive SOLO en el backend (por prefix).
 * ─────────────────────────────────────────────────────────────────────────── */

const fincasFetcher: Fetcher = async () => {
  const res  = await getFilteredLocations()
  const locs = (res.data as LocationDTOListApiResponse | undefined)?.data ?? []
  const data = locs.map(l => ({ location: l.codeLocation ?? '', name: l.descr ?? l.codeLocation ?? '' }))
  return { success: 'true', message: '', data, traceId: null }
}

const categoriesFetcher: Fetcher = async () => {
  const res = await getCategories()
  let cats: unknown[] = []
  try { cats = JSON.parse((res.data as StringApiResponse).data ?? '[]') } catch { cats = [] }
  return { success: 'true', message: '', data: cats, traceId: null }
}

// CATÁLOGO (master products) → filas para "cargar insumo", con existencia 0 (sin movimiento aún).
const catalogFetcher: Fetcher = async () => {
  const res = await getMasterProducts()
  const all = (res.data as MasterProductDTOListApiResponse | undefined)?.data ?? []
  const data = all.flatMap(p => (p.mv ?? []).map(v => ({
    idVariety:       v.idVariety ?? 0,
    varietyName:     v.name ?? '',
    sku:             p.sku ?? '',
    measurementUnit: p.measurementUnit ?? '',
    consumption:     0,
    remaining:       0,
  })))
  return { success: 'true', message: '', data, traceId: null }
}

const registry = buildRegistry({
  fetchers: { FINCAS: fincasFetcher, CATEGORIES: categoriesFetcher, CATALOG: catalogFetcher },
  computeds: {
    skuPrefix: ctx => {
      const opts = (ctx.$options ?? {}) as Record<string, { AggregatedCode?: string } | undefined>
      return (opts.subcategory ?? opts.category)?.AggregatedCode ?? ''
    },
    // nuevo total = existencia (remaining) ± ajuste (qty), no baja de 0.
    newTotal: r => Math.max(0, num(r.remaining) + num(r.qty)),
  },
})

export default function AdjustPage() {
  return (
    <TrxModule
      prefix={PREFIX}
      registry={registry}
      title="inventoryAdjustments"
      subtitle="adjustSubtitle"
      heading="adjustStock"
      trxLabel="adjustment"
    />
  )
}
