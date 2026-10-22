import { buildRegistry, TrxModule } from '@/entities/trx'
import { locationsFetcher, categoriesFetcher, catalogFetcher } from '@/shared/lib/trxFetchers'

const PREFIX = 'AJT'
const num = (v: unknown) => Number(v ?? 0) || 0


const registry = buildRegistry({
  fetchers: { LOCATIONS: locationsFetcher, CATEGORIES: categoriesFetcher, CATALOG: catalogFetcher },
  computeds: {
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
