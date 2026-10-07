import { memo } from "react";
import { AlarmBadge } from "./AlarmBadge";
import { evaluateAlarms } from "@/entities/grossMarginSalesRow";
import { computeCostBreakdown } from "@/entities/grossMarginSalesRow";
import type { SalesRow } from "@/entities/grossMarginSalesRow";

const FLAGGED_KEYS = ["purchaseCost", "packing", "labour", "transport", "margin"] as const;

// Memoized per row -- TanStack Table re-invokes every visible cell's render
// function on any table-level state change (sort, filter, column-visibility
// toggle), which was recomputing evaluateAlarms/computeCostBreakdown for
// every row on every such change, even though a row's own alarm state only
// actually changes when its own data does. `row` is `row.original`, whose
// reference stays stable across a re-render that doesn't touch this row's
// underlying data, so memo() actually skips work here.
// REFACTOR_PLAN.md phase 02: extracted out of sales-table.tsx's inline
// alarms column `cell` renderer.
export const AlarmsCell = memo(function AlarmsCell({ row }: { row: SalesRow }) {
  const alarms = evaluateAlarms(row);
  const breakdown = computeCostBreakdown(row);
  const flaggedKeys = FLAGGED_KEYS.filter((key) => alarms[key] === "alarm");
  if (flaggedKeys.length === 0) {
    return <AlarmBadge state="ok" />;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {flaggedKeys.map((key) => {
        const cat = breakdown.find((c) => c.key === key)!;
        return (
          <AlarmBadge
            key={key}
            state="alarm"
            detail={{
              categoryLabel: cat.label,
              value: cat.value,
              threshold: cat.threshold,
              isFloor: cat.isFloor,
            }}
          />
        );
      })}
    </div>
  );
});
