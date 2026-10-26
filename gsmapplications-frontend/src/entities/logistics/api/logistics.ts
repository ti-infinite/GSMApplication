import { grossMarginFetch, RelayError } from "@/shared/lib/ihAgent";
import type { CarrierSlot, LogisticsFilters, LogisticsLine, LogisticsRow, LogisticsUpdateBody } from "../model/types";

// Relay contract (gross-margin-relay/logistics.py, EC2):
//   GET  /gross-margin-public/logistics               -> { rows: LogisticsRow[] }
//   GET  /gross-margin-public/logistics/filters       -> LogisticsFilters
//   PUT  /gross-margin-public/logistics/{id}          <- LogisticsUpdateBody -> { updated, row }
//   POST /gross-margin-public/logistics/{id}/confirm  <- { option: "A" | "B" | null } -> { updated, row }
//   GET  /gross-margin-public/logistics/{id}/lines    -> { rows: LogisticsLine[] }

async function parse<T>(res: Response, fallback: string): Promise<T> {
  const json = await res.json();
  if (!res.ok) throw new RelayError(res.status, json?.detail ?? fallback);
  return json as T;
}

export const logisticsApi = {
  async list(): Promise<LogisticsRow[]> {
    const res = await grossMarginFetch("/logistics");
    return (await parse<{ rows: LogisticsRow[] }>(res, "Failed to load logistics")).rows;
  },
  async filters(): Promise<LogisticsFilters> {
    const res = await grossMarginFetch("/logistics/filters");
    return parse<LogisticsFilters>(res, "Failed to load filters");
  },
  async update(id: number, body: LogisticsUpdateBody): Promise<LogisticsRow> {
    const res = await grossMarginFetch(`/logistics/${id}`, { method: "PUT", body: JSON.stringify(body) });
    return (await parse<{ row: LogisticsRow }>(res, "Failed to save the shipment")).row;
  },
  async confirm(id: number, option: CarrierSlot | null): Promise<LogisticsRow> {
    const res = await grossMarginFetch(`/logistics/${id}/confirm`, { method: "POST", body: JSON.stringify({ option }) });
    return (await parse<{ row: LogisticsRow }>(res, "Failed to confirm carrier")).row;
  },
  async lines(id: number): Promise<LogisticsLine[]> {
    const res = await grossMarginFetch(`/logistics/${id}/lines`);
    return (await parse<{ rows: LogisticsLine[] }>(res, "Failed to load invoice lines")).rows;
  },
};
