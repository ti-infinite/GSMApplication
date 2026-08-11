import { buildRegistry, TrxModule } from '@/entities/trx'
import { locationsFetcher, categoriesFetcher, catalogFetcher } from '@/shared/lib/trxFetchers'

const PREFIX = 'REQ'   // tipo de TRX → marca la definición (TrxDefinition) y la cabeza del trxId

// skuPrefix (category/subcategory → filtro de sku) es un DEFAULT_COMPUTEDS del motor — no hace
// falta redeclararlo acá (registry/computeds.ts).
const registry = buildRegistry({
  fetchers: { LOCATIONS: locationsFetcher, CATEGORIES: categoriesFetcher, CATALOG: catalogFetcher },
})

export default function RequirementsPage() {
  return (
    <TrxModule
      prefix={PREFIX}
      registry={registry}
      title="requirements"
      subtitle="requirementsSubtitle"
      heading="makeSupplyRequirement"
      trxLabel="requirement"
    />
  )
}
