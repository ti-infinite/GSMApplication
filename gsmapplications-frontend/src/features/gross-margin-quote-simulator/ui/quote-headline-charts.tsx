"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { formatCurrency, formatPercent } from "@/shared/lib/format";
import type { SalesRow } from "@/entities/gross-margin-sales-row";

// Two charts, not one dual-axis chart -- $ metrics and % metrics never
// share a scale, avoiding the classic misleading dual-axis trap.
export function QuoteHeadlineCharts({ actual, simulated }: { actual: SalesRow; simulated: SalesRow }) {
  const actualGM = actual.AvgUnitPrice !== null && actual.FinalUnitCost !== null ? actual.AvgUnitPrice - actual.FinalUnitCost : null;
  const simulatedGM = simulated.AvgUnitPrice !== null && simulated.FinalUnitCost !== null ? simulated.AvgUnitPrice - simulated.FinalUnitCost : null;

  const dollarData = [
    { metric: "Avg Sales Price", Actual: actual.AvgUnitPrice, Simulated: simulated.AvgUnitPrice },
    { metric: "Final Unit Cost", Actual: actual.FinalUnitCost, Simulated: simulated.FinalUnitCost },
    { metric: "Gross Margin $", Actual: actualGM, Simulated: simulatedGM },
  ];

  const percentData = [
    { metric: "Cost Ratio", Actual: actual.CostRatio !== null ? actual.CostRatio * 100 : null, Simulated: simulated.CostRatio !== null ? simulated.CostRatio * 100 : null },
    { metric: "Gross Margin %", Actual: actual.GrossMargin !== null ? actual.GrossMargin * 100 : null, Simulated: simulated.GrossMargin !== null ? simulated.GrossMargin * 100 : null },
  ];

  const tooltipStyle = {
    background: "var(--color-popover)",
    border: "1px solid var(--color-border)",
    borderRadius: 8,
    fontSize: 12,
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Dollar metrics</CardTitle>
          <CardDescription>Actual vs. Simulated</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dollarData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="metric" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={{ stroke: "var(--color-border)" }} />
              <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} axisLine={{ stroke: "var(--color-border)" }} width={70} />
              <Tooltip formatter={(v) => formatCurrency(typeof v === "number" ? v : Number(v))} contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Actual" fill="var(--color-muted-foreground)" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="Simulated" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ratio metrics</CardTitle>
          <CardDescription>Actual vs. Simulated</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={percentData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="metric" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={{ stroke: "var(--color-border)" }} />
              <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} axisLine={{ stroke: "var(--color-border)" }} width={50} />
              <Tooltip formatter={(v) => formatPercent(typeof v === "number" ? v / 100 : Number(v) / 100)} contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Actual" fill="var(--color-muted-foreground)" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="Simulated" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
