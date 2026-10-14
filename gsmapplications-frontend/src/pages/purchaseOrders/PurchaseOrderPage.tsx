import { buildRegistry, TrxModule, pivotAttributes, formatMoney } from '@/entities/trx'
import type { Fetcher } from '@/entities/trx'
import { locationsFetcher, categoriesFetcher, catalogFetcher } from '@/shared/lib/trxFetchers'
import { getTransaction, getFilteredSuppliers, getFilteredVarieties } from '@/shared/api/operations/endpoints'
import type {
  TrxResponseDTOListApiResponse, SupplierDTOListApiResponse, VarietyCostBySupplierDTOListApiResponse,
} from '@/shared/api/operations/model'

const PREFIX = 'OCM'   // Orden de Compra — TrxDefinition + cabeza del trxId

/* ───────────────────────────────────────────────────────────────────────────
 * REGISTRY del módulo — lo ESPECÍFICO. El CONFIG (JsonFront/REA/Workflow) vive en el
 * backend (por prefix): TrxModule lo trae con filtered-trxDefinitions. OC es
 * documento-driven: SEARCHMISSINGTRX (líneas) + LOADSUPPLIER (proveedor) + LOADPRICEBYSUPPLIER
 * (precio por proveedor, enriquece por idVariety). Solo la ubicación necesita opciones locales.
 * ─────────────────────────────────────────────────────────────────────────── */

const envelope = (data: unknown[]) => ({ success: 'true', message: '', data, traceId: null })

// Líneas del requerimiento: filtered-trx({ trxDocument }) → data[0].trxProducts, atributos pivoteados.
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


// Proveedores: filtered-suppliers → SupplierDTO[] (idSupplier/nameSupplier/contact — el `contact`
// crudo viaja completo en la data, `computeds.emailSupplier` lo lee de ahí vía `$options`).
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

// LOADMISSINGTRX NO se registra → cae al httpFetcher (executor genérico del backend).
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
    // Precio de la línea = costo de producción + extra (del proveedor elegido). Sin proveedor → "—".
    // Renombrado de "priceQty" a "unitPrice" para matchear el `selectorValue` del JsonFront.
    unitPrice: row => {
      if (row.productionCost == null || row.productionCost === '') return undefined
      return Number(row.productionCost ?? 0) + Number(row.extraCost ?? 0)
    },
    // Total de la orden (heading badge, `headingBadge="orderTotal"` abajo) — suma qty × unitPrice
    // del CARRITO (`$items`, no `$rows`: acá lo que se confirma es la collection). Misma fórmula
    // que `unitPrice` (los items del carrito ya vienen con productionCost/extraCost mergeados,
    // heredan el enrichBy de cuando estaban en la tabla principal).
    orderTotal: ({ $items }) => {
      // Fijo desde $0 (no oculto hasta el primer item): así el badge siempre está ahí,
      // dando feedback constante de que existe un total corriendo, en vez de aparecer
      // de la nada recién cuando se agrega algo.
      const items = ($items as Record<string, unknown>[]) ?? []
      const total = items.reduce((s, r) => {
        if (r.productionCost == null || r.productionCost === '') return s
        return s + Number(r.qty ?? 0) * (Number(r.productionCost ?? 0) + Number(r.extraCost ?? 0))
      }, 0)
      return formatMoney(total)
    },
    // Email del proveedor ELEGIDO (`idSupplier`) — derivado (`JsonFront.derive`), igual mecanismo
    // que `skuPrefix`: `$options.idSupplier` es la opción CRUDA del combo (el SupplierDTO entero,
    // `contact` incluido), no solo optionValue/optionLabel. Sin proveedor o sin contact → "".
    // createTrx ya NO necesita override — `EmailSupplier` llega solo en el context enriquecido.
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
