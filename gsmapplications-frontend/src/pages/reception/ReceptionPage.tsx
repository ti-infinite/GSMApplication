import { buildRegistry, TrxModule, pivotAttributes } from '@/entities/trx'
import type { Fetcher } from '@/entities/trx'
import { getFilteredLocations } from '@/shared/api/application/endpoints'
import type { LocationDTOListApiResponse } from '@/shared/api/application/model'
import { getTransaction, getCategories, getMasterProducts } from '@/shared/api/operations/endpoints'
import type {
  TrxResponseDTOListApiResponse, StringApiResponse, MasterProductDTOListApiResponse,
} from '@/shared/api/operations/model'

const PREFIX = 'RPI'   // Recepción — deriva de OCM (LOADMISSINGTRX: source=RPI, relative=OCM)

/* ───────────────────────────────────────────────────────────────────────────
 * REGISTRY del módulo — lo ESPECÍFICO. El CONFIG (JsonFront/REA/Workflow) vive en el
 * backend (por prefix). Documento-driven, igual que OCM: SEARCHMISSINGTRX trae las
 * líneas del OCM elegido; `qty` arranca = `originalQty` (aceptado por defecto, bloqueado
 * hasta que la fila se marque `rejected` — ver renderers `receivedQtyInput`/`rejectButton`).
 * ─────────────────────────────────────────────────────────────────────────── */

const envelope = (data: unknown[]) => ({ success: 'true', message: '', data, traceId: null })

// Ubicación (gate).
const fincasFetcher: Fetcher = async () => {
  const res  = await getFilteredLocations()
  const locs = (res.data as LocationDTOListApiResponse | undefined)?.data ?? []
  const data = locs.map(l => ({ location: l.codeLocation ?? '', name: l.descr ?? l.codeLocation ?? '' }))
  return envelope(data)
}

// Líneas del OCM elegido: filtered-trx({ trxDocument }) → data[0].trxProducts.
// originalQty = qty (lo ordenado en el OCM); qty arranca igual (aceptado por defecto).
const searchMissingTrx: Fetcher = async (_process, params) => {
  const res = await getTransaction({ trxDocument: params.trxDocument ?? '' })
  const trx = (res.data as TrxResponseDTOListApiResponse | undefined)?.data?.[0]
  // Header del OCM (trxAttributes, ej. IdSupplier) heredado en CADA fila — así viaja con el
  // producto hasta que RPI confirma y lo vuelve a mandar (createTrx lo toma de la fila si
  // "idSupplier" está declarado en el trxAttributes del JsonFront de RPI y no hay filtro que
  // lo ponga en el context). No es un dato de línea real, es puro passthrough hacia Factura.
  const headerAttrs = pivotAttributes(trx?.trxAttributes)
  const data = (trx?.trxProducts ?? []).map(p => ({
    idVariety:   p.idVariety ?? 0,
    varietyName: p.varietyName ?? '',
    sku:         p.sku ?? '',
    // pivotAttributes PRIMERO: si el documento origen guarda algo bajo las mismas claves
    // (originalQty/comment/measurementUnit), que gane lo de abajo, no lo heredado.
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

// Categorías (picker "cargar insumo"). JSON string → parse.
const categoriesFetcher: Fetcher = async () => {
  const res = await getCategories()
  let cats: unknown[] = []
  try { cats = JSON.parse((res.data as StringApiResponse).data ?? '[]') } catch { cats = [] }
  return envelope(cats)
}

// Catálogo (master products) → filas para "cargar insumo" (lo que llega fuera del OCM).
const catalogFetcher: Fetcher = async () => {
  const res = await getMasterProducts()
  const all = (res.data as MasterProductDTOListApiResponse | undefined)?.data ?? []
  const data = all.flatMap(p => (p.mv ?? []).map(v => ({
    idVariety:       v.idVariety ?? 0,
    varietyName:     v.name ?? '',
    sku:             p.sku ?? '',
    measurementUnit: p.measurementUnit ?? '',
    originalQty:     0,
    qty:             0,
    rejected:        false,
    comment:      '',
  })))
  return envelope(data)
}

const registry = buildRegistry({
  fetchers: { FINCAS: fincasFetcher, SEARCHMISSINGTRX: searchMissingTrx, CATALOG: catalogFetcher, CATEGORIES: categoriesFetcher },
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
