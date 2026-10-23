import { RelayError, grossMarginFetch as relayFetch } from "@/shared/lib/ihAgent";
import type { CommissionRow } from "../model/types";

// REWRITE (2026-10-08): Commission isn't a db_ai table anymore
// (db_ms.Clients/ClientAttributes, shared ERP data) and has no compound
// identity or true delete -- just list + upsert, always keyed by Customer,
// mirrors entities/grossMarginRebate/api/rebate.ts.
export async function fetchCommissions(): Promise<CommissionRow[]> {
  const res = await relayFetch("/commission");
  const body = await res.json();
  if (!res.ok) throw new RelayError(res.status, body?.detail ?? "Failed to load commissions");
  return body.rows as CommissionRow[];
}
