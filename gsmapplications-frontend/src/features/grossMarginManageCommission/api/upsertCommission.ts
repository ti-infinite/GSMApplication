import { grossMarginFetch as relayFetch } from "@/shared/lib/ihAgent";

// REWRITE (2026-10-08): mirrors features/grossMarginManageRebate/api/putRebate.ts
// exactly -- Commission has no [id] route anymore (see entities/grossMarginCommission),
// every write is a plain PUT to the resource path itself, keyed by customer in
// the body. Shared by CommissionCard.tsx (Apply) and CommissionLogTable.tsx
// (inline edit + reset).
export async function upsertCommission(
  customer: string,
  commissionType: "percent" | "value",
  commissionAmount: number
): Promise<unknown> {
  const res = await relayFetch("/commission", {
    method: "PUT",
    body: JSON.stringify({ customer, commissionType, commissionAmount }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.detail ?? "Failed to update commission.");
  return json;
}
