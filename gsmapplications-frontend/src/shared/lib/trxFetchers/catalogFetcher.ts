import { getMasterProducts } from '@/shared/api/operations/endpoints'
import type { MasterProductDTOListApiResponse } from '@/shared/api/operations/model'

export interface CatalogRow {
  idVariety: number
  varietyName: string
  sku: string
  measurementUnit: string
}

export const fetchCatalogRows = async (): Promise<CatalogRow[]> => {
  const res = await getMasterProducts()
  const all = (res.data as MasterProductDTOListApiResponse | undefined)?.data ?? []
  return all.flatMap(p => (p.mv ?? []).map(v => ({
    idVariety:       v.idVariety ?? 0,
    varietyName:     v.name ?? '',
    sku:             p.sku ?? '',
    measurementUnit: p.measurementUnit ?? '',
  })))
}

export const catalogFetcher = async () => {
  const data = (await fetchCatalogRows()).map(r => ({ ...r, consumption: 0, remaining: 0 }))
  return { success: 'true' as const, message: '', data, traceId: null }
}
