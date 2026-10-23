import { useTranslation } from "react-i18next";
import type { RankedBarDatum } from "@/shared/ui/ranked-bar-chart";
import { formatCurrency, formatPercent } from "@/shared/lib/format";

export interface StatChipsProps {
  data: RankedBarDatum[];
  valueType?: "currency" | "percent";
  /** One of grossMargin.chart.units.* */
  unit?: "varieties" | "blends" | "customers";
}

// Quick "highest / lowest / average" context row above a ranked bar chart --
// a bare ranked bar list reads as vague without a reference point.
export function StatChips({ data, valueType = "percent", unit = "customers" }: StatChipsProps) {
  const { t } = useTranslation();
  const formatValue = valueType === "percent" ? formatPercent : formatCurrency;
  const values = data.map((d) => d.value).filter((v): v is number => v !== null);
  if (values.length === 0) return null;
  const highest = Math.max(...values);
  const lowest = Math.min(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return (
    <div className="mb-3 flex flex-wrap gap-2 text-xs">
      <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">
        {t("grossMargin.chart.count", { count: data.length, unit: t(`grossMargin.chart.units.${unit}`) })}
      </span>
      <span className="rounded-full bg-success/10 px-2.5 py-1 font-medium text-success">
        {t("grossMargin.chart.high", { value: formatValue(highest) })}
      </span>
      <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">
        {t("grossMargin.chart.avg", { value: formatValue(avg) })}
      </span>
      <span className="rounded-full bg-destructive/10 px-2.5 py-1 font-medium text-destructive">
        {t("grossMargin.chart.low", { value: formatValue(lowest) })}
      </span>
    </div>
  );
}
