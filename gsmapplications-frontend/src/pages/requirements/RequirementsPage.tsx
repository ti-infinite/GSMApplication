import { buildRegistry, TrxModule } from '@/entities/trx'
import { locationsFetcher, categoriesFetcher, catalogFetcher } from '@/shared/lib/trxFetchers'

const PREFIX = 'REQ'   // tipo de TRX → marca la definición (TrxDefinition) y la cabeza del trxId

const registry = buildRegistry({
  fetchers: { LOCATIONS: locationsFetcher, CATEGORIES: categoriesFetcher, CATALOG: catalogFetcher },
  computeds: {
    // skuPrefix = AggregatedCode de la subcategoría (o categoría) ELEGIDA.
    skuPrefix: ctx => {
      const opts = (ctx.$options ?? {}) as Record<string, { AggregatedCode?: string } | undefined>
      const opt = opts.subcategory ?? opts.category
      return opt?.AggregatedCode ?? ''
    },
  },
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
