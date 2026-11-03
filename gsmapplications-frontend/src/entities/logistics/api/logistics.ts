import { ihFetch, RelayError } from "@/shared/lib/ihAgent";
import { getFilteredLocations } from "@/shared/api/application/endpoints";
import type { LocationDTOListApiResponse } from "@/shared/api/application/model";
import type { LocationOption, LogisticsLine, LogisticsRow, LogisticsUpdateBody } from "../model/types";

// ih-logistics service (EC2, behind Caddy `/logistics*`, which injects the API key).
// Every response is the same envelope as the GSM .NET APIs: { success, message, data, errorType, traceId }.
//   GET  /logistics               -> data: LogisticsRow[]  ship dates from 30 days ago onward, upcoming included
//   PUT  /logistics/{id}          <- LogisticsUpdateBody -> data: LogisticsRow
//   GET  /logistics/{id}/lines    -> data: LogisticsLine[]
const BASE = "/logistics";

interface IhApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
}

async function parse<T>(res: Response, fallback: string): Promise<T> {
  const json = (await res.json().catch(() => null)) as IhApiResponse<T> | null;
  if (!res.ok || !json?.success) throw new RelayError(res.status, json?.message || fallback);
  return json.data as T;
}

export const logisticsApi = {
  async list(): Promise<LogisticsRow[]> {
    const res = await ihFetch(BASE);
    return parse<LogisticsRow[]>(res, "Failed to load logistics");
  },
  async update(id: number, body: LogisticsUpdateBody): Promise<LogisticsRow> {
    const res = await ihFetch(`${BASE}/${id}`, { method: "PUT", body: JSON.stringify(body) });
    return parse<LogisticsRow>(res, "Failed to save the shipment");
  },
  async lines(id: number): Promise<LogisticsLine[]> {
    const res = await ihFetch(`${BASE}/${id}/lines`);
    return parse<LogisticsLine[]>(res, "Failed to load invoice lines");
  },
};

// WHS filter: the user's locations from GSM (db_ms.Locations), filtered by tenant and permissions.
// value = CodeLocation, the code stored in IHLogistics.WHS.
export async function fetchLocations(): Promise<LocationOption[]> {
  const res = await getFilteredLocations();
  const list = (res.data as LocationDTOListApiResponse | undefined)?.data ?? [];
  return list.filter((l) => l.codeLocation).map((l) => ({ code: l.codeLocation!, name: l.descr ?? l.codeLocation! }));
}
