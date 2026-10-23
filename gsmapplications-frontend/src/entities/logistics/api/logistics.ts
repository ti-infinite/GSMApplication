import { RelayError, ihFetch } from '@/shared/lib/ihAgent'
import type { CarrierChange, LogisticsFilterOptions, LogisticsFilters, LogisticsRow } from '../model/types'

// ih-agent contract (db_srv.IHLogistics):
//   GET  /logistics/filters                                   → { whs: string[], divisions: string[] }
//   GET  /logistics?whs=&division=&dateFrom=&dateTo=          → { rows: LogisticsRow[] }
//   PUT  /logistics/carriers   { rows: CarrierChange[] }      → { updated: number }
// Errors come back as { detail: string } with a non-2xx status.
const BASE = '/logistics'

async function readJson<T>(res: Response, fallback: string): Promise<T> {
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new RelayError(res.status, body?.detail ?? fallback)
  return body as T
}

export async function fetchLogisticsFilterOptions(): Promise<LogisticsFilterOptions> {
  const body = await readJson<LogisticsFilterOptions>(await ihFetch(`${BASE}/filters`), 'Failed to load logistics filters')
  return { whs: body?.whs ?? [], divisions: body?.divisions ?? [] }
}

export async function fetchLogistics(filters: LogisticsFilters): Promise<LogisticsRow[]> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value)
  const body = await readJson<{ rows?: LogisticsRow[] }>(await ihFetch(`${BASE}?${params}`), 'Failed to load logistics')
  return body?.rows ?? []
}

export async function saveCarriers(rows: CarrierChange[]): Promise<number> {
  const res = await ihFetch(`${BASE}/carriers`, { method: 'PUT', body: JSON.stringify({ rows }) })
  const body = await readJson<{ updated?: number }>(res, 'Failed to save carriers')
  return body?.updated ?? rows.length
}
