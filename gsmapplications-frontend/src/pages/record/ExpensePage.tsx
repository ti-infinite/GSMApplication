import { buildRegistry, TrxModule } from '@/entities/trx'
import { locationsFetcher, categoriesFetcher, catalogFetcher } from '@/shared/lib/trxFetchers'

const PREFIX = 'GST'

/* ───────────────────────────────────────────────────────────────────────────
 * REGISTRY del módulo — lo ESPECÍFICO. Genéricos (renderers/guards/createTrx) de
 * buildRegistry. El CONFIG (JsonFront/REA/Workflow) vive SOLO en el backend (por prefix).
 * ─────────────────────────────────────────────────────────────────────────── */

// skuPrefix (category/subcategory → filtro de sku) es un DEFAULT_COMPUTEDS del motor — no hace
// falta redeclararlo acá (registry/computeds.ts).
const registry = buildRegistry({
  fetchers: { LOCATIONS: locationsFetcher, CATEGORIES: categoriesFetcher, CATALOG: catalogFetcher },
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
