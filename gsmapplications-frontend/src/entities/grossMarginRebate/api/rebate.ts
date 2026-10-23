import { RelayError, grossMarginFetch as relayFetch } from "@/shared/lib/ihAgent";
import type { RebateRow } from "../model/types";

// Rebate isn't a db_ai table (db_ms.Clients/ClientAttributes, shared ERP
// data) and has no compound identity or true delete -- just list + upsert,
// always keyed by Customer, so it doesn't fit makeResourceClient's shape
// and needs no [id] route.
export async function fetchRebates(): Promise<RebateRow[]> {
  const res = await relayFetch("/rebate");
  const body = await res.json();
  if (!res.ok) throw new RelayError(res.status, body?.detail ?? "Failed to load rebates");
  return body.rows as RebateRow[];
}

export async function upsertRebate(body: { customer: string; rebateValue: number }) {
  const res = await relayFetch("/rebate", { method: "PUT", body: JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok) throw new RelayError(res.status, json?.detail ?? "Failed to update rebate");
  return json;
}
