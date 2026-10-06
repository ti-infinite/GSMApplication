import { grossMarginFetch as relayFetch } from "@/shared/lib/ihAgent";

// Shared by rebate-card.tsx (Apply) and rebate-log-table.tsx (inline Edit +
// Reset-to-$0.00) -- both PUT the same {customer, rebateValue} body;
// deduped from 2 independent implementations. REFACTOR_PLAN.md phase 01,
// item 8.
//
// Next.js -> Vite conversion: calls the relay directly now, not this app's
// own now-deleted /api/rebate route -- reads the relay's real {detail}
// error field instead of the old route's {error} translation.
export async function putRebate(customer: string, rebateValue: number): Promise<unknown> {
  const res = await relayFetch("/rebate", {
    method: "PUT",
    body: JSON.stringify({ customer, rebateValue }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.detail ?? "Failed to update rebate.");
  return json;
}
