import { RelayError, grossMarginFetch as relayFetch } from "@/shared/lib/ihAgent";
import type { CommissionRow } from "../model/types";

export async function fetchCommissions(): Promise<CommissionRow[]> {
  const res = await relayFetch("/commission");
  const body = await res.json();
  if (!res.ok) throw new RelayError(res.status, body?.detail ?? "Failed to load commissions");
  return body.rows as CommissionRow[];
}

export async function applyCommission(body: {
  customer: string;
  varieties: string[];
  commissionType: "percent" | "value";
  commissionPercent?: number;
  commissionValue?: number;
}) {
  const res = await relayFetch("/commission", { method: "POST", body: JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok) throw new RelayError(res.status, json?.detail ?? "Failed to apply commission");
  return json;
}

export async function editCommission(
  id: number,
  body: { commissionType: "percent" | "value"; commissionPercent?: number; commissionValue?: number }
) {
  const res = await relayFetch(`/commission/${id}`, { method: "PUT", body: JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok) throw new RelayError(res.status, json?.detail ?? "Failed to update commission");
  return json;
}

export async function deleteCommission(id: number) {
  const res = await relayFetch(`/commission/${id}`, { method: "DELETE" });
  const json = await res.json();
  if (!res.ok) throw new RelayError(res.status, json?.detail ?? "Failed to delete commission");
  return json;
}
