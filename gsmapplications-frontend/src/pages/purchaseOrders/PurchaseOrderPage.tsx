import { buildRegistry, TrxModule, pivotAttributes, formatMoney } from '@/entities/trx'
import type { Fetcher } from '@/entities/trx'
import { locationsFetcher, categoriesFetcher, catalogFetcher } from '@/shared/lib/trxFetchers'
import { getTransaction, getFilteredSuppliers, getFilteredVarieties } from '@/shared/api/operations/endpoints'
import type {
  TrxResponseDTOListApiResponse, SupplierDTOListApiResponse, VarietyCostBySupplierDTOListApiResponse,
} from '@/shared/api/operations/model'

const PREFIX = 'OCM'   // Orden de Compra — TrxDefinition + cabeza del trxId


const envelope = (data: unknown[]) => ({ success: 'true', message: '', data, traceId: null })

const searchMissingTrx: Fetcher = async (_process, params) => {
  const res = await getTransaction({ trxDocument: params.TrxDocument ?? '' })
  const trx = (res.data as TrxResponseDTOListApiResponse | undefined)?.data?.[0]
  const data = (trx?.trxProducts ?? []).map(p => ({
    idVariety:   p.idVariety ?? 0,
    varietyName: p.varietyName ?? '',
    sku:         p.sku ?? '',
    qty:         p.qty ?? '',
    ...pivotAttributes(p.trxProductAttributes),
    measurementUnit: p.measurementUnit ?? '',
  }))
  return envelope(data)
}

const loadSuppliers: Fetcher = async () => {
  const res  = await getFilteredSuppliers({})
  const data = (res.data as SupplierDTOListApiResponse | undefined)?.data ?? []
  return envelope(data)
}

// Costo por proveedor: filtered-varieties({ idSupplier }) → costo por variedad (enriquece por idVariety).
const loadPriceBySupplier: Fetcher = async (_process, params) => {
  const res  = await getFilteredVarieties({ idSupplier: params.idSupplier || undefined })
  const list = (res.data as VarietyCostBySupplierDTOListApiResponse | undefined)?.data ?? []
  const data = list.map(v => ({ idVariety: v.idVariety, productionCost: v.productionCost, extraCost: v.extraCost ?? 0 }))
  return envelope(data)
}

const registry = buildRegistry({
  fetchers: {
    LOCATIONS: locationsFetcher,
    SEARCHMISSINGTRX: searchMissingTrx,
    LOADSUPPLIER: loadSuppliers,
    LOADPRICEBYSUPPLIER: loadPriceBySupplier,
    CATALOG: catalogFetcher,
    CATEGORIES: categoriesFetcher,
  },
  computeds: {
    
    unitPrice: row => {
      if (row.productionCost == null || row.productionCost === '') return undefined
      return Number(row.productionCost ?? 0) + Number(row.extraCost ?? 0)
    },
    
    orderTotal: ({ $items }) => {
      const items = ($items as Record<string, unknown>[]) ?? []
      const total = items.reduce((s, r) => {
        if (r.productionCost == null || r.productionCost === '') return s
        return s + Number(r.qty ?? 0) * (Number(r.productionCost ?? 0) + Number(r.extraCost ?? 0))
      }, 0)
      return formatMoney(total)
    },
    emailSupplier: ({ $options }) => {
      const supplier = ($options as Record<string, { contact?: string | null }> | undefined)?.idSupplier
      if (!supplier?.contact) return ''
      try { return (JSON.parse(supplier.contact) as { email?: string }).email ?? '' } catch { return '' }
    },
  },
})

export default function PurchaseOrderPage() {
  return (
    <TrxModule
      prefix={PREFIX}
      registry={registry}
      title="purchaseOrder"
      subtitle="purchaseOrderSubtitle"
      heading="createPurchaseOrder"
      headingBadge="orderTotal"
      trxLabel="order"
    />
  )
}
