import { grossMarginFetch } from "@/shared/lib/ihAgent";

export interface SupplierPurchaseCost {
  supplier: string;
  avgPrice: number;
  transactions: number;
}

export interface PurchaseSuppliersLookup {
  flag: 0 | 1 | null; // 1 = unit-sourced (packed), 0 = by the pound, null = no data
  suppliers: SupplierPurchaseCost[];
}

const NONE: PurchaseSuppliersLookup = { flag: null, suppliers: [] };

export async function fetchPurchaseSuppliers(calculatedSku: string, skuMeasure: string, warehouse: string): Promise<PurchaseSuppliersLookup> {
  try {
    const params = new URLSearchParams({ calculatedSku, skuMeasure, warehouse });
    const res = await grossMarginFetch(`/purchase-cost/suppliers?${params.toString()}`);
    if (!res.ok) return NONE;
    const json = (await res.json()) as Partial<PurchaseSuppliersLookup>;
    return { flag: json.flag ?? null, suppliers: json.suppliers ?? [] };
  } catch {
    return NONE;
  }
}

export function weightedAverage(suppliers: SupplierPurchaseCost[]): number | null {
  const weight = suppliers.reduce((sum, s) => sum + Math.max(s.transactions, 0), 0);
  if (suppliers.length === 0) return null;
  if (weight === 0) return suppliers.reduce((sum, s) => sum + s.avgPrice, 0) / suppliers.length;
  return suppliers.reduce((sum, s) => sum + s.avgPrice * Math.max(s.transactions, 0), 0) / weight;
}
