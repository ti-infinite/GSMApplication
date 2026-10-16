import { memo } from "react";
import { useTranslation } from "react-i18next";
import { AlarmBadge } from "./AlarmBadge";
import { evaluateAlarms } from "@/entities/grossMarginSalesRow";
import { computeCostBreakdown } from "@/entities/grossMarginSalesRow";
import type { SalesRow } from "@/entities/grossMarginSalesRow";

const FLAGGED_KEYS = ["purchaseCost", "packing", "labour", "transport", "margin"] as const;

// Memoized per row -- without it, TanStack Table re-invokes this on every
// sort/filter/column-visibility change, recomputing alarms for rows whose
// own data didn't change.
export const AlarmsCell = memo(function AlarmsCell({ row }: { row: SalesRow }) {
  const { t } = useTranslation();
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
              categoryLabel: t(`grossMargin.alarms.categories.${cat.key}`),
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
