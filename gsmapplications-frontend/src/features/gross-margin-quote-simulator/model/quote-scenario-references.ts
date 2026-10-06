// Shared Commission/Rebate/TransportCost matching logic for a real
// (non-synthetic) SalesRow -- extracted from quote-simulator-tab.tsx so the
// scenario manager's Excel export can resolve the same RecomputeInputs for
// a saved scenario without duplicating the lookup rules. New-customer
// synthetic-transport handling stays in quote-simulator-tab.tsx: a saved
// scenario's baseline is always a real (or real-shaped) SalesRow by the
// time it's persisted, so the synthetic branch never applies here.

import type { CommissionRow } from "@/entities/gross-margin-commission";
import type { RebateRow } from "@/entities/gross-margin-rebate";
import type { SalesRow } from "@/entities/gross-margin-sales-row";
import type { TransportCostRow } from "@/entities/gross-margin-transport-cost";
import type { RecomputeInputs } from "./recompute";

export function findCommissionForRow(commissions: CommissionRow[], row: SalesRow): CommissionRow | null {
  return commissions.find((c) => c.Customer === row.Customer && c.Variety === row.Variety) ?? null;
}

export function findRebateForRow(rebates: RebateRow[], row: SalesRow): RebateRow | null {
  return rebates.find((r) => r.Customer === row.Customer) ?? null;
}

export function findTransportCostForRow(transportCosts: TransportCostRow[], row: SalesRow): TransportCostRow | null {
  return (
    transportCosts.find(
      (t) => t.DivisionName === row.Customer && t.MeasurementUnitValue === row.MeasurementUnitValue
    ) ?? null
  );
}

export function buildRecomputeInputsForRow(
  row: SalesRow,
  commissions: CommissionRow[],
  rebates: RebateRow[],
  transportCosts: TransportCostRow[]
): RecomputeInputs {
  return {
    baseline: row,
    commission: findCommissionForRow(commissions, row),
    rebate: findRebateForRow(rebates, row),
    transportCost: findTransportCostForRow(transportCosts, row),
  };
}

// Mixed-herb rows are already whole-pack priced (1 case), so "quantity"
// there starts at 1; every other row is priced per single unit, so the
// natural starting quantity is the variety's own real case size. Shared
// with quote-simulator-tab.tsx (a fresh row selection) and the scenario
// manager (a v1 scenario saved before packQuantity existed).
export function defaultPackQuantity(row: SalesRow): number {
  if (row.IsMixedHerbWholePack === 1) return 1;
  return row.PackQty && row.PackQty > 0 ? row.PackQty : 1;
}
