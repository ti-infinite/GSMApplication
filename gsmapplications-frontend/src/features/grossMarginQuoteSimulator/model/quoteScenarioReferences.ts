// Shared Commission/Rebate/TransportCost matching for a real (non-synthetic)
// SalesRow, so the scenario manager's Excel export resolves the same
// RecomputeInputs a saved scenario was built with, without duplicating the
// lookup rules.

import type { CommissionRow } from "@/entities/grossMarginCommission";
import type { RebateRow } from "@/entities/grossMarginRebate";
import type { SalesRow } from "@/entities/grossMarginSalesRow";
import type { TransportCostRow } from "@/entities/grossMarginTransportCost";
import type { RecomputeInputs } from "./recompute";

// REWRITE (2026-10-08): Commission matches on Customer only now, same as
// Rebate -- see entities/grossMarginCommission/model/types.ts's own rewrite note.
export function findCommissionForRow(commissions: CommissionRow[], row: SalesRow): CommissionRow | null {
  return commissions.find((c) => c.Customer === row.Customer) ?? null;
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

// Mixed-herb rows are whole-pack priced (1 case), so quantity starts at 1;
// every other row starts at its own real case size.
export function defaultPackQuantity(row: SalesRow): number {
  if (row.IsMixedHerbWholePack === 1) return 1;
  return row.PackQty && row.PackQty > 0 ? row.PackQty : 1;
}
