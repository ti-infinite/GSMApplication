import type { SalesRow } from "@/entities/gross-margin-sales-row";
import { evaluateAlarms, type AlarmRuleKey, type AlarmState } from "@/entities/gross-margin-sales-row";
import { computeCostBreakdown } from "@/entities/gross-margin-sales-row";

export interface RuleStats {
  rule: AlarmRuleKey;
  ok: number;
  alarm: number;
  unknown: number;
  total: number;
}

export interface WarehouseStats {
  warehouse: string;
  rowCount: number;
  avgGrossMargin: number | null;
}

export interface OverviewStats {
  totalRows: number;
  distinctVarieties: number;
  distinctCustomers: number;
  distinctWarehouses: number;
  avgGrossMargin: number | null;
  avgCostRatio: number | null;
  avgPurchaseCostRatio: number | null;
  rowsInAnyAlarm: number;
  ruleStats: RuleStats[];
  warehouseStats: WarehouseStats[];
}

const RULE_KEYS: AlarmRuleKey[] = [
  "purchaseCost",
  "packing",
  "labour",
  "transport",
  "margin",
];

function avgOf(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function computeOverviewStats(rows: SalesRow[]): OverviewStats {
  const allAlarms = rows.map(evaluateAlarms);

  const ruleStats: RuleStats[] = RULE_KEYS.map((rule) => {
    const states = allAlarms.map((a) => a[rule] as AlarmState);
    return {
      rule,
      ok: states.filter((s) => s === "ok").length,
      alarm: states.filter((s) => s === "alarm").length,
      unknown: states.filter((s) => s === "unknown").length,
      total: states.length,
    };
  });

  const warehouses = Array.from(new Set(rows.map((r) => r.Warehouse))).sort();
  const warehouseStats: WarehouseStats[] = warehouses.map((warehouse) => {
    const whRows = rows.filter((r) => r.Warehouse === warehouse);
    return {
      warehouse,
      rowCount: whRows.length,
      avgGrossMargin: avgOf(whRows.map((r) => r.GrossMargin)),
    };
  });

  return {
    totalRows: rows.length,
    distinctVarieties: new Set(rows.map((r) => r.Variety)).size,
    distinctCustomers: new Set(rows.map((r) => r.Customer)).size,
    distinctWarehouses: new Set(rows.map((r) => r.Warehouse)).size,
    avgGrossMargin: avgOf(rows.map((r) => r.GrossMargin)),
    avgCostRatio: avgOf(rows.map((r) => r.CostRatio)),
    avgPurchaseCostRatio: avgOf(
      rows.map((r) => computeCostBreakdown(r).find((c) => c.key === "purchaseCost")?.value ?? null)
    ),
    rowsInAnyAlarm: allAlarms.filter((a) => a.anyAlarm).length,
    ruleStats,
    warehouseStats,
  };
}
