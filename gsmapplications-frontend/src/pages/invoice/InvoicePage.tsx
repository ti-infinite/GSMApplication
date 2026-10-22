import { buildRegistry, TrxModule, pivotAttributes, formatMoney } from '@/entities/trx'
import type { Fetcher } from '@/entities/trx'
import { locationsFetcher, categoriesFetcher, fetchCatalogRows } from '@/shared/lib/trxFetchers'
import { getTransaction, getFilteredVarieties } from '@/shared/api/operations/endpoints'
import type {
  TrxResponseDTOListApiResponse,
  VarietyCostBySupplierDTOListApiResponse,
} from '@/shared/api/operations/model'

const PREFIX = 'FAC'   // Factura — deriva de RPI (LOADMISSINGTRX: source=FAC, relative=RPI)

const envelope = (data: unknown[]) => ({ success: 'true', message: '', data, traceId: null })

let currentIdSupplier = ''
let priceByVariety = new Map<number, number>()

const searchMissingTrx: Fetcher = async (_process, params) => {
  const res = await getTransaction({ trxDocument: params.trxDocument ?? '' })
  const trx = (res.data as TrxResponseDTOListApiResponse | undefined)?.data?.[0]
  const idSupplier = pivotAttributes(trx?.trxAttributes).idSupplier ?? ''
  currentIdSupplier = idSupplier

  priceByVariety = new Map<number, number>()
  if (idSupplier) {
    try {
      const costRes  = await getFilteredVarieties({ idSupplier })
      const costList = (costRes.data as VarietyCostBySupplierDTOListApiResponse | undefined)?.data ?? []
      for (const c of costList) {
        if (c.idVariety != null) priceByVariety.set(c.idVariety, Number(c.productionCost ?? 0) + Number(c.extraCost ?? 0))
      }
    } catch { /* sin costo por proveedor → price queda en 0, el usuario lo completa a mano */ }
  }

  const data = (trx?.trxProducts ?? []).map(p => ({
    idVariety:   p.idVariety ?? 0,
    varietyName: p.varietyName ?? '',
    sku:         p.sku ?? '',

    idSupplier,
    ...pivotAttributes(p.trxProductAttributes),
    measurementUnit: p.measurementUnit ?? '',
    qty:      p.qty ?? 0,
    unitPrice: priceByVariety.get(p.idVariety ?? -1) ?? 0,
  }))
  return envelope(data)
}

const catalogFetcher: Fetcher = async () => {
  const data = (await fetchCatalogRows()).map(r => ({
    ...r,
    idSupplier: currentIdSupplier,
    qty:        0,
    unitPrice:  priceByVariety.get(r.idVariety) ?? 0,
  }))
  return envelope(data)
}

const registry = buildRegistry({
  fetchers: { LOCATIONS: locationsFetcher, SEARCHMISSINGTRX: searchMissingTrx, CATALOG: catalogFetcher, CATEGORIES: categoriesFetcher },
  computeds: {
    productTotal: row => Number(row.qty || 0) * Number(row.unitPrice || 0),
    // Total de la factura (heading badge) — Factura no tiene carrito, suma sobre `$rows`.
    invoiceTotal: ({ $rows }) => {
      const rows = ($rows as Record<string, unknown>[]) ?? []
      const total = rows.reduce((s, r) => s + Number(r.qty ?? 0) * Number(r.unitPrice ?? 0), 0)
      return formatMoney(total)
    },
  },
})

export default function InvoicePage() {
  return (
    <TrxModule
      prefix={PREFIX}
      registry={registry}
      title="invoice"
      subtitle="invoiceSubtitle"
      heading="prepareInvoice"
      headingBadge="invoiceTotal"
      trxLabel="invoice"
    />
  )
}
