import type { SalesRow } from "@/entities/gross-margin-sales-row";

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

// Simple (unweighted) mean across whatever rows land in a group. db_ai.Sales
// carries no quantity/volume column to weight by (removed at the user's
// request -- see README.md), so this is an average of the per-row averages,
// not a volume-weighted one. Labeled as such everywhere it's displayed.
function avgOf(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

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
// variety, with the raw metric value per row (not re-aggregated -- a given
// Variety/Customer pair is already close to 1:1 with the underlying grain of
// db_ai.Sales, since it's keyed on Variety x Warehouse x Customer; where a
// customer bought from multiple warehouses, this averages just those rows).
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
  const varieties = Array.from(new Set(rows.map((r) => r.Variety))).sort();
  const customers = Array.from(new Set(rows.map((r) => r.Customer))).sort();
  return { varieties, customers, cells };
}
