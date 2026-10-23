import type { SalesRow } from "./types";
import { THRESHOLDS, YELLOW_RATIO_OF_MAX } from "@/shared/lib/thresholds";
import type { AlarmRuleKey } from "./alarms";

export type Zone = "green" | "yellow" | "red" | "unknown";

// Same float-noise tolerance as model/alarms.ts (see that file's comment for
// the exact 0.13-boundary case this absorbs).
const EPSILON = 1e-9;

export interface CostCategory {
  key: AlarmRuleKey;
  label: string;
  value: number | null;
  threshold: number;
  isFloor: boolean; // true for margin (higher is better), false for cost-ratio categories (lower is better)
  zone: Zone;
}

// Short row labels for each cost category (the actual percentage sits
// right next to them in a table cell, so no threshold text here).
export const CATEGORY_SHORT_LABELS: Record<AlarmRuleKey, string> = {
  purchaseCost: "Purchase Cost",
  packing: "Packing + Sticker + Box",
  labour: "Labour",
  transport: "Transport",
  margin: "Gross Margin",
};

// A missing input counts as $0 rather than poisoning the whole sum to
// "unknown" -- mirrors the ISNULL(x, 0) treatment sql/15_sales.sql's
// FinalUnitCost formula uses. Exported: also reused by lib/recompute.ts
// (Quote Simulator), which needs the exact same semantics.
export function sumTreatingNullAsZero(...vals: (number | null)[]): number {
  return vals.reduce<number>((a, b) => a + (b ?? 0), 0);
}

export function ratioOrNull(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null || denominator === 0) return null;
  return numerator / denominator;
}

function zoneForMax(value: number | null, max: number): Zone {
  if (value === null) return "unknown";
  if (value > max + EPSILON) return "red";
  if (value >= max * YELLOW_RATIO_OF_MAX - EPSILON) return "yellow";
  return "green";
}

// Gross Margin banding, shared by Sales Explorer's Gross Margin cell and
// the Cost Breakdown tab's margin category -- see
// GROSS_MARGIN_CELL_YELLOW_FLOOR in shared/lib/thresholds.ts.
export function grossMarginCellZone(value: number | null): Zone {
  if (value === null) return "unknown";
  if (value < THRESHOLDS.GROSS_MARGIN_CELL_YELLOW_FLOOR - EPSILON) return "red";
  if (value < THRESHOLDS.MIN_GROSS_MARGIN - EPSILON) return "yellow";
  return "green";
}

// Per-row breakdown of every cost category as an actual percentage of
// AvgUnitPrice (not just a pass/fail state), each with a red/yellow/green/
// unknown zone -- the numbers model/alarms.ts already computes, surfaced
// directly instead of collapsed into a single OK/ALARM badge.
export function computeCostBreakdown(row: SalesRow): CostCategory[] {
  const denom = row.AvgUnitPrice;

  const purchaseCost = ratioOrNull(row.FinalPurPrice, denom);
  const packing = ratioOrNull(sumTreatingNullAsZero(row.Packing, row.Sticker, row.Box), denom);
  const labour = ratioOrNull(
    sumTreatingNullAsZero(row.LabourProd, row.LabourRepack, row.LabourAssembler),
    denom
  );
  const transport = ratioOrNull(row.Transport, denom);
  const margin = row.GrossMargin;

  return [
    {
      key: "purchaseCost",
      label: CATEGORY_SHORT_LABELS.purchaseCost,
      value: purchaseCost,
      threshold: THRESHOLDS.PURCHASE_COST_MAX,
      isFloor: false,
      zone: zoneForMax(purchaseCost, THRESHOLDS.PURCHASE_COST_MAX),
    },
    {
      key: "packing",
      label: CATEGORY_SHORT_LABELS.packing,
      value: packing,
      threshold: THRESHOLDS.PACKING_MAX,
      isFloor: false,
      zone: zoneForMax(packing, THRESHOLDS.PACKING_MAX),
    },
    {
      key: "labour",
      label: CATEGORY_SHORT_LABELS.labour,
      value: labour,
      threshold: THRESHOLDS.LABOUR_MAX,
      isFloor: false,
      zone: zoneForMax(labour, THRESHOLDS.LABOUR_MAX),
    },
    {
      key: "transport",
      label: CATEGORY_SHORT_LABELS.transport,
      value: transport,
      threshold: THRESHOLDS.TRANSPORT_MAX,
      isFloor: false,
      zone: zoneForMax(transport, THRESHOLDS.TRANSPORT_MAX),
    },
    {
      key: "margin",
      label: CATEGORY_SHORT_LABELS.margin,
      value: margin,
      threshold: THRESHOLDS.MIN_GROSS_MARGIN,
      isFloor: true,
      zone: grossMarginCellZone(margin),
    },
  ];
}
