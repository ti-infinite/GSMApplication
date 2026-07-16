import { getMasterProducts } from '@/shared/api/operations/endpoints'
import type { MasterProductDTOListApiResponse } from '@/shared/api/operations/model'
import type { Fetcher } from '@/entities/trx'
import type { StockRow } from './stockResponse'

// Seed estable → el mismo sku/variedad da SIEMPRE el mismo valor (no cambia por
// render). Incluye location+categoría para que cambiar filtro cambie los valores.
function seed(s: string): number {
  return [...s].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
}

// Fetcher: consume masterProducts REAL, aplana a variedades y les genera stock
// (consumo/restante) simulado pero estable. En real, el stock vendría de su
// propio endpoint; acá es simulado sobre productos reales.
export const mockFetcher: Fetcher = async (process, params) => {
  if (process !== 'LOADCS') {
    return { success: 'false', message: `Process "${process}" no encontrado`, data: [], traceId: null }
  }

  const res      = await getMasterProducts()
  const body     = res.data as MasterProductDTOListApiResponse | undefined
  const all      = body?.data ?? []
  const prefix   = params.skuPrefix ?? ''
  const loc      = params.location ?? ''

  // Filtra por el prefijo de SKU de la categoría/subcategoría (vacío → todos).
  const products = prefix ? all.filter(p => (p.sku ?? '').startsWith(prefix)) : all

  if (import.meta.env.DEV) {
    console.debug('[Requirements fetcher] masterProducts →', { total: all.length, prefix, filtrados: products.length })
  }

  const rows: StockRow[] = products.flatMap(p => {
    const sku = p.sku ?? ''
    return (p.mv ?? []).map(v => {
      const idVariety = v.idVariety ?? 0
      const base = seed(`${sku}-${idVariety}|${loc}`)   // consumo/restante por warehouse (estable)
      return {
        id:          `${sku}-${idVariety}`,
        idVariety,
        sku,
        varietyName: v.name ?? '',
        consumption: Number(((base % 60) / 10).toFixed(2)),
        remaining:   Number(((base * 3 % 500) / 10).toFixed(2)),
      }
    })
  })

  return { success: 'true', message: '', data: rows, traceId: null }
}
