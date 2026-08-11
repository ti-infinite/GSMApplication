import { buildRegistry, TrxModule } from '@/entities/trx'
import { locationsFetcher, categoriesFetcher, catalogFetcher } from '@/shared/lib/trxFetchers'

const PREFIX = 'GST'

/* ───────────────────────────────────────────────────────────────────────────
 * REGISTRY del módulo — lo ESPECÍFICO. Genéricos (renderers/guards/createTrx) de
 * buildRegistry. El CONFIG (JsonFront/REA/Workflow) vive SOLO en el backend (por prefix).
 * ─────────────────────────────────────────────────────────────────────────── */

const registry = buildRegistry({
  fetchers: { LOCATIONS: locationsFetcher, CATEGORIES: categoriesFetcher, CATALOG: catalogFetcher },
  computeds: {
    // skuPrefix = AggregatedCode de la subcategoría (o categoría) ELEGIDA (igual que REQ).
    skuPrefix: ctx => {
      const opts = (ctx.$options ?? {}) as Record<string, { AggregatedCode?: string } | undefined>
      return (opts.subcategory ?? opts.category)?.AggregatedCode ?? ''
    },
  },
})

export default function ExpensePage() {
  return (
    <TrxModule
      prefix={PREFIX}
      registry={registry}
      title="expenses"
      subtitle="expensesSubtitle"
      heading="recordExpense"
      trxLabel="expense"
    />
  )
}
