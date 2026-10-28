import { ihFetch, RelayError } from "@/shared/lib/ihAgent";
import type { LogisticsFilters, LogisticsLine, LogisticsRow, LogisticsUpdateBody } from "../model/types";

// ih-logistics service (EC2, behind Caddy `/logistics*`, which injects the API key):
//   GET  /logistics               -> { rows: LogisticsRow[] }  ship dates from 30 days ago onward, upcoming included
//   GET  /logistics/filters       -> LogisticsFilters
//   PUT  /logistics/{id}          <- LogisticsUpdateBody -> { updated, row }
//   GET  /logistics/{id}/lines    -> { rows: LogisticsLine[] }
const BASE = "/logistics";

async function parse<T>(res: Response, fallback: string): Promise<T> {
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new RelayError(res.status, json?.detail ?? fallback);
  return json as T;
}

export const logisticsApi = {
  async list(): Promise<LogisticsRow[]> {
    const res = await ihFetch(BASE);
    return (await parse<{ rows: LogisticsRow[] }>(res, "Failed to load logistics")).rows;
  },
  async filters(): Promise<LogisticsFilters> {
    const res = await ihFetch(`${BASE}/filters`);
    return parse<LogisticsFilters>(res, "Failed to load filters");
  },
  async update(id: number, body: LogisticsUpdateBody): Promise<LogisticsRow> {
    const res = await ihFetch(`${BASE}/${id}`, { method: "PUT", body: JSON.stringify(body) });
    return (await parse<{ row: LogisticsRow }>(res, "Failed to save the shipment")).row;
  },
  async lines(id: number): Promise<LogisticsLine[]> {
    const res = await ihFetch(`${BASE}/${id}/lines`);
    return (await parse<{ rows: LogisticsLine[] }>(res, "Failed to load invoice lines")).rows;
  },
};
