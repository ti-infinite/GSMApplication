import { grossMarginFetch as relayFetch } from "@/shared/lib/ihAgent";

// Rebate has no [id] route (see entities/grossMarginRebate) so it doesn't
// fit makeResourceClient's shape -- every write is a plain PUT to the
// resource path itself, keyed by customer in the body, not the URL.
// Slice-internal to manage-rebate -- the only two consumers live here.
export async function putRebate(customer: string, rebateValue: number): Promise<unknown> {
  const res = await relayFetch("/rebate", {
    method: "PUT",
    body: JSON.stringify({ customer, rebateValue }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.detail ?? "Failed to update rebate.");
  return json;
}
