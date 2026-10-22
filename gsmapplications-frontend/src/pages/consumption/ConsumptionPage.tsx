import { buildRegistry, TrxModule } from '@/entities/trx'
import { locationsFetcher, categoriesFetcher, catalogFetcher } from '@/shared/lib/trxFetchers'

const PREFIX = 'GST'

const registry = buildRegistry({
  fetchers: { LOCATIONS: locationsFetcher, CATEGORIES: categoriesFetcher, CATALOG: catalogFetcher },
})

export default function ConsumptionPage() {
  return (
    <TrxModule
      prefix={PREFIX}
      registry={registry}
      title="consumptions"
      subtitle="consumptionsSubtitle"
      heading="recordConsumption"
      trxLabel="consumption"
    />
  )
}
