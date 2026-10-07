import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { formatCurrency } from "@/shared/lib/format";
import { sumTreatingNullAsZero } from "@/entities/grossMarginSalesRow";
import type { SalesRow } from "@/entities/grossMarginSalesRow";

// Same 4-category taxonomy as the radar chart / Cost Breakdown tab, in $
// this time instead of %. One consistent grouping across the whole
// dashboard, fits --chart-1..4 with no 5th token needed.
function toStack(row: SalesRow, label: string) {
  return {
    label,
    "Purchase Cost": row.FinalPurPrice ?? 0,
    "Packing + Sticker + Box": sumTreatingNullAsZero(row.Packing, row.Sticker, row.Box),
    Labour: sumTreatingNullAsZero(row.LabourProd, row.LabourRepack, row.LabourAssembler),
    Transport: row.Transport ?? 0,
  };
}

export function QuoteCostCompositionChart({ actual, simulated }: { actual: SalesRow; simulated: SalesRow }) {
  const data = [toStack(actual, "Actual"), toStack(simulated, "Simulated")];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost composition</CardTitle>
        <CardDescription>How Final Unit Cost is built, Actual vs. Simulated</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
            <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} axisLine={{ stroke: "var(--color-border)" }} />
            <YAxis type="category" dataKey="label" width={80} tick={{ fontSize: 12, fill: "var(--color-foreground)" }} axisLine={{ stroke: "var(--color-border)" }} />
            <Tooltip
              formatter={(v) => formatCurrency(typeof v === "number" ? v : Number(v))}
              contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Purchase Cost" stackId="cost" fill="var(--color-chart-1)" />
            <Bar dataKey="Packing + Sticker + Box" stackId="cost" fill="var(--color-chart-2)" />
            <Bar dataKey="Labour" stackId="cost" fill="var(--color-chart-3)" />
            <Bar dataKey="Transport" stackId="cost" fill="var(--color-chart-4)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
