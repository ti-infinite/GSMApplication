import { getFilteredLocations } from '@/shared/api/application/endpoints'
import type { LocationDTOListApiResponse } from '@/shared/api/application/model'

// Ubicación (finca) — filtro FIJO de toda TRX (gate). CRUD sin lógica de negocio (fetch +
// reshape trivial), por eso vive en shared/lib (junto al resto del código de soporte escrito
// a mano: fetcher.ts, idb.ts, etc.), no en entities. Sin tipar `Fetcher` acá a propósito: ese
// tipo vive en entities/trx (una capa arriba) y shared no puede importar de ahí — la
// compatibilidad se valida por estructura en el punto de uso (buildRegistry, en la página).
export const locationsFetcher = async () => {
  const res  = await getFilteredLocations()
  const locs = (res.data as LocationDTOListApiResponse | undefined)?.data ?? []
  const data = locs.map(l => ({ location: l.codeLocation ?? '', name: l.descr ?? l.codeLocation ?? '' }))
  return { success: 'true' as const, message: '', data, traceId: null }
}
