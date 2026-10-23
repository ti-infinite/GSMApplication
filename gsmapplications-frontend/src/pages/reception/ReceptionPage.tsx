import { buildRegistry, TrxModule, pivotAttributes } from '@/entities/trx'
import type { Fetcher } from '@/entities/trx'
import { locationsFetcher, categoriesFetcher, fetchCatalogRows } from '@/shared/lib/trxFetchers'
import { getTransaction } from '@/shared/api/operations/endpoints'
import type {
  TrxResponseDTOListApiResponse,
} from '@/shared/api/operations/model'

const PREFIX = 'RPI'   // Recepción — deriva de OCM (LOADMISSINGTRX: source=RPI, relative=OCM)

const envelope = (data: unknown[]) => ({ success: 'true', message: '', data, traceId: null })


const searchMissingTrx: Fetcher = async (_process, params) => {
  const res = await getTransaction({ trxDocument: params.trxDocument ?? '' })
  const trx = (res.data as TrxResponseDTOListApiResponse | undefined)?.data?.[0]
  const headerAttrs = pivotAttributes(trx?.trxAttributes)
  const data = (trx?.trxProducts ?? []).map(p => ({
    idVariety:   p.idVariety ?? 0,
    varietyName: p.varietyName ?? '',
    sku:         p.sku ?? '',
    ...headerAttrs,
    ...pivotAttributes(p.trxProductAttributes),
    measurementUnit: p.measurementUnit ?? '',
    originalQty:     p.qty ?? 0,
    qty:             p.qty ?? 0,
    rejected:        false,
    comment:         '',
  }))
  return envelope(data)
}

const catalogFetcher: Fetcher = async () => {
  const data = (await fetchCatalogRows()).map(r => ({ ...r, originalQty: 0, qty: 0, rejected: false, comment: '' }))
  return envelope(data)
}

const registry = buildRegistry({
  fetchers: { LOCATIONS: locationsFetcher, SEARCHMISSINGTRX: searchMissingTrx, CATALOG: catalogFetcher, CATEGORIES: categoriesFetcher },
})

export default function ReceptionPage() {
  return (
    <TrxModule
      prefix={PREFIX}
      registry={registry}
      title="reception"
      subtitle="receptionSubtitle"
      heading="warehouseReception"
      trxLabel="reception"
    />
  )
}
