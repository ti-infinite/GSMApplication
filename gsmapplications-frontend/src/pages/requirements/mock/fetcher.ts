import type { ApiEnvelope, Fetcher } from '@/entities/trx'
import { stockFor } from './stockResponse'

// Fetcher MOCK: simula el backend por `process`. Devuelve data DISTINTA por
// location (así se valida el switch de warehouse). En real, esto pega a la API
// (?process=LOADCS&location=…).
export const mockFetcher: Fetcher = async (process, params) => {
  await new Promise(r => setTimeout(r, 150))   // simula latencia de red
  if (process === 'LOADCS') return stockFor(params.location ?? '', params.category ?? '') as ApiEnvelope<unknown>
  return { success: 'false', message: `Process "${process}" no encontrado`, data: [], traceId: null }
}
