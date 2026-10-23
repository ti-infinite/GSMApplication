import type { SalesRow } from "./types";
import { avgOf } from "@/shared/lib/stats";

export type RankMetric = "AvgUnitPrice" | "CostRatio" | "GrossMargin";

export interface VarietyAgg {
  key: string; // Variety
  calculatedSKU: string;
  avgUnitPrice: number | null;
  costRatio: number | null;
  grossMargin: number | null;
  rowCount: number;
}

export interface CustomerAgg {
  key: string; // Customer
  avgUnitPrice: number | null;
  costRatio: number | null;
  grossMargin: number | null;
  rowCount: number;
}

// db_ai.Sales has no quantity/volume column to weight by, so avgOf below
// averages the per-row averages, not a volume-weighted average. Labeled
// as such everywhere it's displayed.
function groupBy<T>(rows: T[], keyFn: (row: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = keyFn(row);
    const existing = groups.get(key);
    if (existing) existing.push(row);
    else groups.set(key, [row]);
  }
  return groups;
}

export function aggregateByVariety(rows: SalesRow[]): VarietyAgg[] {
  const groups = groupBy(rows, (r) => r.Variety);
  return Array.from(groups.entries()).map(([variety, groupRows]) => ({
    key: variety,
    calculatedSKU: groupRows[0].CalculatedSKU,
    avgUnitPrice: avgOf(groupRows.map((r) => r.AvgUnitPrice)),
    costRatio: avgOf(groupRows.map((r) => r.CostRatio)),
    grossMargin: avgOf(groupRows.map((r) => r.GrossMargin)),
    rowCount: groupRows.length,
  }));
}

export function aggregateByCustomer(rows: SalesRow[]): CustomerAgg[] {
  const groups = groupBy(rows, (r) => r.Customer);
  return Array.from(groups.entries()).map(([customer, groupRows]) => ({
    key: customer,
    avgUnitPrice: avgOf(groupRows.map((r) => r.AvgUnitPrice)),
    costRatio: avgOf(groupRows.map((r) => r.CostRatio)),
    grossMargin: avgOf(groupRows.map((r) => r.GrossMargin)),
    rowCount: groupRows.length,
  }));
}

// For the Variety x Client Explorer: every customer who bought a specific
// variety, with the raw per-row metric (not re-aggregated -- a Variety/
// Customer pair is near 1:1 with db_ai.Sales' grain of Variety x Warehouse
// x Customer; multi-warehouse customers get averaged across those rows).
export function customersForVariety(
  rows: SalesRow[],
  variety: string
): CustomerAgg[] {
  return aggregateByCustomer(rows.filter((r) => r.Variety === variety));
}

export interface HeatmapCell {
  variety: string;
  customer: string;
  value: number | null;
}

export interface HeatmapData {
  varieties: string[];
  customers: string[];
  cells: Map<string, number | null>; // key: `${variety}␟${customer}`
}

export function cellKey(variety: string, customer: string): string {
  return `${variety}␟${customer}`;
}

export function buildHeatmapData(rows: SalesRow[], metric: RankMetric): HeatmapData {
  const byVarietyCustomer = groupBy(rows, (r) => cellKey(r.Variety, r.Customer));
  const cells = new Map<string, number | null>();
  for (const [key, groupRows] of byVarietyCustomer.entries()) {
    cells.set(key, avgOf(groupRows.map((r) => r[metric])));
  }
  // Busiest varieties first -- the heatmap only renders a slice of these by
  // default (see Heatmap's "show more"), so the ones worth seeing first are
  // the ones with the most sales activity, not whichever sorts first alphabetically.
  const varietyCounts = new Map<string, number>();
  for (const r of rows) varietyCounts.set(r.Variety, (varietyCounts.get(r.Variety) ?? 0) + 1);
  const varieties = Array.from(varietyCounts.keys()).sort(
    (a, b) => varietyCounts.get(b)! - varietyCounts.get(a)! || a.localeCompare(b)
  );
  const customers = Array.from(new Set(rows.map((r) => r.Customer))).sort();
  return { varieties, customers, cells };
}
