import { buildRegistry, TrxModule, pivotAttributes, formatMoney } from '@/entities/trx'
import type { Fetcher } from '@/entities/trx'
import { locationsFetcher, categoriesFetcher, fetchCatalogRows } from '@/shared/lib/trxFetchers'
import { getTransaction, getFilteredVarieties } from '@/shared/api/operations/endpoints'
import type {
  TrxResponseDTOListApiResponse,
  VarietyCostBySupplierDTOListApiResponse,
} from '@/shared/api/operations/model'

const PREFIX = 'FAC'   // Factura — deriva de RPI (LOADMISSINGTRX: source=FAC, relative=RPI)

/* ───────────────────────────────────────────────────────────────────────────
 * REGISTRY del módulo — confirm-as-is, igual patrón que RPI/VFI (sin carrito,
 * `products` ES la transacción). Por ahora solo crea la factura (FAC) — la
 * exportación/descarga es un módulo aparte, más adelante.
 * ─────────────────────────────────────────────────────────────────────────── */

const envelope = (data: unknown[]) => ({ success: 'true', message: '', data, traceId: null })

// idSupplier + costo por variedad de la RPI ACTIVA — variables de módulo (no context/JSON),
// mismo patrón que `supplierEmailById` en OCM: `searchMissingTrx` las llena al cargar la RPI;
// `catalogFetcher` (corre aparte, sin saber qué RPI está activa) las lee para que un insumo
// agregado a mano por el picker TAMBIÉN traiga IdSupplier (createTrx lo necesita en `source[0]`
// si esa fila termina siendo la primera) y su precio sugerido, no 0 fijo.
let currentIdSupplier = ''
let priceByVariety = new Map<number, number>()

// Líneas de la RPI elegida: filtered-trx({ trxDocument }) → data[0].trxProducts.
// idSupplier heredado del header de la RPI (que a su vez lo heredó del OCM — passthrough en
// cadena, nadie lo selecciona acá): con eso se precarga `price` como SUGERIDO desde el costo
// real del proveedor (mismo endpoint que usa OC) — el usuario lo corrige si hace falta, no
// arranca en 0. Sin idSupplier (documento viejo, sin ese dato) queda en 0 como antes.
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
    // Heredado del header de la RPI — antes solo se usaba LOCAL para el precio, nunca quedaba
    // en la fila → createTrx (context[k] o, si no está, source[0]?.[k]) nunca lo encontraba y
    // la Factura se creaba sin IdSupplier pese a estar en su trxAttributes.
    idSupplier,
    // pivotAttributes PRIMERO: que gane el default de acá, no lo heredado de la RPI.
    ...pivotAttributes(p.trxProductAttributes),
    measurementUnit: p.measurementUnit ?? '',
    qty:      p.qty ?? 0,
    unitPrice: priceByVariety.get(p.idVariety ?? -1) ?? 0,
  }))
  return envelope(data)
}

// Catálogo (master products) → filas para "cargar insumo" (algo que llegó fuera de la RPI).
// idSupplier/precio salen de las variables de módulo que llena `searchMissingTrx` (arriba) —
// un insumo agregado a mano hereda el mismo proveedor/costo sugerido que las líneas de la RPI,
// en vez de quedar en 0 y sin IdSupplier.
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
