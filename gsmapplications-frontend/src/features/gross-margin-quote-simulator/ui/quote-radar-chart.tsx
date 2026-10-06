"use client";

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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { computeCostBreakdown } from "@/entities/gross-margin-sales-row";
import { formatPercent } from "@/shared/lib/format";
import type { SalesRow } from "@/entities/gross-margin-sales-row";
import { THRESHOLDS } from "@/shared/lib/thresholds";

// Every dimension expressed as % of AvgUnitPrice -- reuses
// computeCostBreakdown()'s own categories directly, so $ and % metrics
// share one honest scale with no new normalization logic invented.
export function QuoteRadarChart({ actual, simulated }: { actual: SalesRow; simulated: SalesRow }) {
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
    category: cat.label,
    actual: cat.value !== null ? cat.value * 100 : 0,
    simulated: (simulatedBreakdown[i].value ?? 0) * 100,
    target: targetByKey[cat.key] * 100,
  }));

  // Recharts always draws later JSX elements on top -- Simulated used to be
  // drawn after Actual, so whenever the two coincide (no overrides active
  // yet, or overrides that happen to net to zero) its more-opaque blue fill
  // completely hid Actual's gray trace underneath, while still LOOKING like
  // a distinct scenario was active even though nothing had changed. Fixed
  // two ways: Actual now draws last so its outline is always visible, and
  // the Simulated layer is only rendered at all once it genuinely differs.
  //
  // Rounded to 0.01 percentage points (not a raw !== compare) because
  // recomputeSalesRow({}) independently re-derives every field in JS from
  // the same baseline inputs the SQL pipeline used -- mathematically
  // identical, but floating-point operations aren't associative across two
  // different runtimes doing the same division/multiplication in a possibly
  // different order, so a sub-cent discrepancy between the two is expected
  // even with zero overrides, not a sign anything actually changed.
  const round = (v: number) => Math.round(v * 100) / 100;
  const hasChanges = data.some((d) => round(d.actual) !== round(d.simulated));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost &amp; margin shape</CardTitle>
        <CardDescription>
          {hasChanges
            ? "Every axis is a % of Avg Sales Unit Price, so costs and margin share one honest scale. For cost axes, closer to center is better; for Gross Margin, farther out is better."
            : "Every axis is a % of Avg Sales Unit Price. Simulated currently matches Actual exactly — adjust an input above to see them diverge."}
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
            {/* isAnimationActive=false: recharts otherwise tweens the polygon
                from whatever it drew last, so switching rows (or resetting
                overrides) could briefly -- or on a slow render, not-so-briefly
                -- show a shape that's mid-transition from the PREVIOUS row's
                data, not the current one. Instant redraw removes that class
                of "why is this stale" bug entirely. */}
            {hasChanges && (
              <Radar name="Simulated" dataKey="simulated" stroke="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.3} isAnimationActive={false} />
            )}
            <Radar name="Actual" dataKey="actual" stroke="var(--color-muted-foreground)" fill="var(--color-muted-foreground)" fillOpacity={hasChanges ? 0.15 : 0.25} isAnimationActive={false} />
            <Radar name="Target" dataKey="target" stroke="var(--color-chart-4)" fill="none" strokeDasharray="4 4" isAnimationActive={false} />
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
