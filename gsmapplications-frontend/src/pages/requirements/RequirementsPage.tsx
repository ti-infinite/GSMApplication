import { buildRegistry, TrxModule } from '@/entities/trx'
import { locationsFetcher, categoriesFetcher, catalogFetcher } from '@/shared/lib/trxFetchers'

const PREFIX = 'REQ'  

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
