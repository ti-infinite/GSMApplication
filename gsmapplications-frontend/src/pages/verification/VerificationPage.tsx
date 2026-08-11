import { buildRegistry, TrxModule, pivotAttributes } from '@/entities/trx'
import type { Fetcher } from '@/entities/trx'
import { locationsFetcher, categoriesFetcher, fetchCatalogRows } from '@/shared/lib/trxFetchers'
import { getTransaction } from '@/shared/api/operations/endpoints'
import type {
  TrxResponseDTOListApiResponse,
} from '@/shared/api/operations/model'

const PREFIX = 'VFI'   // Verificación — deriva de RPI (LOADMISSINGTRX: source=VFI, relative=RPI)

/* ───────────────────────────────────────────────────────────────────────────
 * REGISTRY del módulo — mismo patrón que RPI (Reception), solo cambia de qué
 * documento deriva: acá el "originalQty" es lo que RPI recibió, no lo del OCM.
 * ─────────────────────────────────────────────────────────────────────────── */

const envelope = (data: unknown[]) => ({ success: 'true', message: '', data, traceId: null })

// Líneas del RPI elegido: filtered-trx({ trxDocument }) → data[0].trxProducts.
// originalQty = qty (lo recibido en RPI); qty arranca igual (aceptado por defecto).
const searchMissingTrx: Fetcher = async (_process, params) => {
  const res = await getTransaction({ trxDocument: params.trxDocument ?? '' })
  const trx = (res.data as TrxResponseDTOListApiResponse | undefined)?.data?.[0]
  const data = (trx?.trxProducts ?? []).map(p => ({
    idVariety:   p.idVariety ?? 0,
    varietyName: p.varietyName ?? '',
    sku:         p.sku ?? '',
    // pivotAttributes PRIMERO: RPI trae sus propios OriginalQty/Comment (heredados de OCM) —
    // si fueran después, pisarían lo de acá con el pedido viejo en vez de lo recibido en RPI.
    ...pivotAttributes(p.trxProductAttributes),
    measurementUnit: p.measurementUnit ?? '',
    originalQty:     p.qty ?? 0,
    qty:             p.qty ?? 0,
    rejected:        false,
    comment:     '',
  }))
  return envelope(data)
}

// Catálogo (master products) → filas para "cargar insumo".
const catalogFetcher: Fetcher = async () => {
  const data = (await fetchCatalogRows()).map(r => ({ ...r, originalQty: 0, qty: 0, rejected: false, comment: '' }))
  return envelope(data)
}

const registry = buildRegistry({
  fetchers: { LOCATIONS: locationsFetcher, SEARCHMISSINGTRX: searchMissingTrx, CATALOG: catalogFetcher, CATEGORIES: categoriesFetcher },
})

export default function VerificationPage() {
  return (
    <TrxModule
      prefix={PREFIX}
      registry={registry}
      title="verification"
      subtitle="verificationSubtitle"
      heading="farmVerification"
      trxLabel="verification"
    />
  )
}
