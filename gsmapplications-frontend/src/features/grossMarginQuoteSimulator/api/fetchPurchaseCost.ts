import { grossMarginFetch } from "@/shared/lib/ihAgent";

export interface PurchaseCostLookup {
  flag: 0 | 1 | null;
  purchaseCost: number | null;
}

const NO_MATCH: PurchaseCostLookup = { flag: null, purchaseCost: null };

export async function fetchPurchaseCost(calculatedSku: string, skuMeasure: string, warehouse: string): Promise<PurchaseCostLookup> {
  try {
    const params = new URLSearchParams({ calculatedSku, skuMeasure, warehouse });
    const res = await grossMarginFetch(`/purchase-cost?${params.toString()}`);
    if (!res.ok) return NO_MATCH;
    const json = (await res.json()) as Partial<PurchaseCostLookup>;
    return { flag: json.flag ?? null, purchaseCost: json.purchaseCost ?? null };
  } catch {
    return NO_MATCH;
  }
}
