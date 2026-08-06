import { buildRegistry, TrxModule, pivotAttributes, DEFAULT_ACTIONS } from '@/entities/trx'
import type { Fetcher } from '@/entities/trx'
import { getFilteredLocations } from '@/shared/api/application/endpoints'
import type { LocationDTOListApiResponse } from '@/shared/api/application/model'
import { getTransaction, getFilteredSuppliers, getFilteredVarieties, getCategories, getMasterProducts } from '@/shared/api/operations/endpoints'
import type {
  TrxResponseDTOListApiResponse, SupplierDTOListApiResponse, VarietyCostBySupplierDTOListApiResponse,
  StringApiResponse, MasterProductDTOListApiResponse,
} from '@/shared/api/operations/model'

const PREFIX = 'OCM'   // Orden de Compra — TrxDefinition + cabeza del trxId

/* ───────────────────────────────────────────────────────────────────────────
 * REGISTRY del módulo — lo ESPECÍFICO. El CONFIG (JsonFront/REA/Workflow) vive en el
 * backend (por prefix): TrxModule lo trae con filtered-trxDefinitions. OC es
 * documento-driven: SEARCHMISSINGTRX (líneas) + LOADSUPPLIER (proveedor) + LOADPRICEBYSUPPLIER
 * (precio por proveedor, enriquece por idVariety). Solo la ubicación necesita opciones locales.
 * ─────────────────────────────────────────────────────────────────────────── */

const envelope = (data: unknown[]) => ({ success: 'true', message: '', data, traceId: null })

// Ubicación (gate).
const fincasFetcher: Fetcher = async () => {
  const res  = await getFilteredLocations()
  const locs = (res.data as LocationDTOListApiResponse | undefined)?.data ?? []
  const data = locs.map(l => ({ location: l.codeLocation ?? '', name: l.descr ?? l.codeLocation ?? '' }))
  return envelope(data)
}

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


let supplierEmailById: Record<string, string> = {}

// Proveedores: filtered-suppliers → SupplierDTO[] (idSupplier/nameSupplier).
const loadSuppliers: Fetcher = async () => {
  const res  = await getFilteredSuppliers({})
  const data = (res.data as SupplierDTOListApiResponse | undefined)?.data ?? []
  supplierEmailById = Object.fromEntries(data.map(s => {
    let email = ''
    if (s.contact) { try { email = String((JSON.parse(s.contact) as { email?: string }).email ?? '') } catch { /* contact mal formado → sin email */ } }
    return [String(s.idSupplier ?? ''), email]
  }))
  return envelope(data)
}

// Costo por proveedor: filtered-varieties({ idSupplier }) → costo por variedad (enriquece por idVariety).
const loadPriceBySupplier: Fetcher = async (_process, params) => {
  const res  = await getFilteredVarieties({ idSupplier: params.idSupplier || undefined })
  const list = (res.data as VarietyCostBySupplierDTOListApiResponse | undefined)?.data ?? []
  const data = list.map(v => ({ idVariety: v.idVariety, productionCost: v.productionCost, extraCost: v.extraCost ?? 0 }))
  return envelope(data)
}

// Categorías (para el picker "agregar insumo"). JSON string → parse.
const categoriesFetcher: Fetcher = async () => {
  const res = await getCategories()
  let cats: unknown[] = []
  try { cats = JSON.parse((res.data as StringApiResponse).data ?? '[]') } catch { cats = [] }
  return envelope(cats)
}

// Catálogo (master products) → filas para "agregar insumo" (consumo/restante en 0; sin movimiento aún).
const catalogFetcher: Fetcher = async () => {
  const res = await getMasterProducts()
  const all = (res.data as MasterProductDTOListApiResponse | undefined)?.data ?? []
  const data = all.flatMap(p => (p.mv ?? []).map(v => ({
    idVariety:       v.idVariety ?? 0,
    varietyName:     v.name ?? '',
    sku:             p.sku ?? '',
    measurementUnit: p.measurementUnit ?? '',
    consumption:     0,
    remaining:       0,
  })))
  return envelope(data)
}

// LOADMISSINGTRX NO se registra → cae al httpFetcher (executor genérico del backend).
const registry = buildRegistry({
  fetchers: {
    FINCAS: fincasFetcher,
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
  },
  actions: {
    // createTrx en sí sigue siendo el genérico — no le tocamos nada, solo recibe context y lista
    // trxAttributes. Lo único que hace este wrapper es DEJAR LISTO el valor en el context ANTES de
    // llamarlo, con la key EXACTA que declara el JsonFront (`"EmailSupplier"`, ya así por convención
    // — otros procesos aguas abajo ya lo referencian en ese casing, no camelCase como el resto).
    // El filtro "Proveedor" del JsonFront usa key "idSupplier" (no "supplier") — el lookup acá
    // tiene que matchear esa key exacta del context.
    createTrx: ctx => DEFAULT_ACTIONS.createTrx({
      ...ctx,
      context: { ...ctx.context, EmailSupplier: supplierEmailById[ctx.context.idSupplier ?? ''] ?? '' },
    }),
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
      trxLabel="order"
    />
  )
}
