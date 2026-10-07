import { grossMarginFetch as relayFetch } from "@/shared/lib/ihAgent"
import type { SalesRow } from "../model/types";

export async function fetchSalesRows(): Promise<SalesRow[]> {
  const res = await relayFetch("/sales");
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Relay returned ${res.status}: ${body || res.statusText}`);
  }
  const data = (await res.json()) as { rows: SalesRow[] };
  return data.rows;
}
