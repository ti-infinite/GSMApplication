import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { computeCostBreakdown } from "@/entities/grossMarginSalesRow";
import { formatPercent } from "@/shared/lib/format";
import type { SalesRow } from "@/entities/grossMarginSalesRow";
import { THRESHOLDS } from "@/shared/lib/thresholds";

// Every dimension expressed as % of AvgUnitPrice -- reuses
// computeCostBreakdown()'s own categories directly, so $ and % metrics
// share one honest scale with no new normalization logic invented.
export function QuoteRadarChart({ actual, simulated }: { actual: SalesRow; simulated: SalesRow }) {
  const { t } = useTranslation();
  const actualBreakdown = computeCostBreakdown(actual);
  const simulatedBreakdown = computeCostBreakdown(simulated);

  const targetByKey: Record<string, number> = {
    purchaseCost: THRESHOLDS.PURCHASE_COST_MAX,
    packing: THRESHOLDS.PACKING_MAX,
    labour: THRESHOLDS.LABOUR_MAX,
    transport: THRESHOLDS.TRANSPORT_MAX,
    margin: THRESHOLDS.MIN_GROSS_MARGIN,
  };

  const data = actualBreakdown.map((cat, i) => ({
    category: t(`grossMargin.alarms.categories.${cat.key}`),
    actual: cat.value !== null ? cat.value * 100 : 0,
    simulated: (simulatedBreakdown[i].value ?? 0) * 100,
    target: targetByKey[cat.key] * 100,
  }));

  // Recharts draws later JSX elements on top, so Actual draws last and
  // Simulated only renders once it genuinely differs. Rounded to 0.01
  // points, not a raw !== compare, since floating-point re-derivation isn't
  // associative across runtimes.
  const round = (v: number) => Math.round(v * 100) / 100;
  const hasChanges = data.some((d) => round(d.actual) !== round(d.simulated));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("grossMargin.simulator.charts.radarTitle")}</CardTitle>
        <CardDescription>
          {hasChanges ? t("grossMargin.simulator.charts.radarDescription") : t("grossMargin.simulator.charts.radarNoChanges")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={340}>
          <RadarChart data={data} outerRadius="70%">
            <PolarGrid stroke="var(--color-border)" />
            <PolarAngleAxis dataKey="category" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
            <PolarRadiusAxis
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              tickFormatter={(v) => `${v}%`}
            />
            {/* isAnimationActive=false: otherwise recharts tweens from the
                previous row's shape, briefly showing stale data on switch. */}
            {hasChanges && (
              <Radar name={t("grossMargin.simulator.charts.series.simulated")} dataKey="simulated" stroke="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.3} isAnimationActive={false} />
            )}
            <Radar name={t("grossMargin.simulator.charts.series.actual")} dataKey="actual" stroke="var(--color-muted-foreground)" fill="var(--color-muted-foreground)" fillOpacity={hasChanges ? 0.15 : 0.25} isAnimationActive={false} />
            <Radar name={t("grossMargin.simulator.charts.series.target")} dataKey="target" stroke="var(--color-chart-4)" fill="none" strokeDasharray="4 4" isAnimationActive={false} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value) => formatPercent(typeof value === "number" ? value / 100 : Number(value) / 100)}
              contentStyle={{
                background: "var(--color-popover)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
