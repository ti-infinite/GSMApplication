import { buildRegistry, TrxModule } from '@/entities/trx'
import { locationsFetcher, categoriesFetcher, catalogFetcher } from '@/shared/lib/trxFetchers'

const PREFIX = 'AJT'
const num = (v: unknown) => Number(v ?? 0) || 0

/* ───────────────────────────────────────────────────────────────────────────
 * REGISTRY del módulo — lo ESPECÍFICO. Genéricos (renderers/guards/createTrx) de
 * buildRegistry. El CONFIG (JsonFront/REA/Workflow) vive SOLO en el backend (por prefix).
 * ─────────────────────────────────────────────────────────────────────────── */

const registry = buildRegistry({
  fetchers: { LOCATIONS: locationsFetcher, CATEGORIES: categoriesFetcher, CATALOG: catalogFetcher },
  computeds: {
    // skuPrefix (category/subcategory → filtro de sku) es un DEFAULT_COMPUTEDS del motor
    // (registry/computeds.ts) — no hace falta redeclararlo acá.
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
