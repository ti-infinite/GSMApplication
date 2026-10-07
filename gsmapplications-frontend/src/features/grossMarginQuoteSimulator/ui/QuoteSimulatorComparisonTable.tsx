import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { formatCurrency, formatPercent } from "@/shared/lib/format";
import type { SalesRow } from "@/entities/grossMarginSalesRow";
import { cn } from "@/shared/lib/utils";

interface MetricRow {
  label: string;
  actual: number | null;
  simulated: number | null;
  kind: "currency" | "percent";
  // true = higher is better (Gross Margin); false = lower is better (Cost Ratio, costs)
  higherIsBetter: boolean;
}

function delta(actual: number | null, simulated: number | null): number | null {
  if (actual === null || simulated === null) return null;
  return simulated - actual;
}

function pctDelta(actual: number | null, simulated: number | null): number | null {
  if (actual === null || simulated === null || actual === 0) return null;
  return (simulated - actual) / Math.abs(actual);
}

export function QuoteSimulatorComparisonTable({
  actual,
  simulated,
  isNewCustomerQuote,
}: {
  actual: SalesRow;
  simulated: SalesRow;
  isNewCustomerQuote?: boolean;
}) {
  const actualGrossMarginAmount =
    actual.AvgUnitPrice !== null && actual.FinalUnitCost !== null ? actual.AvgUnitPrice - actual.FinalUnitCost : null;
  const simulatedGrossMarginAmount =
    simulated.AvgUnitPrice !== null && simulated.FinalUnitCost !== null
      ? simulated.AvgUnitPrice - simulated.FinalUnitCost
      : null;

  const rows: MetricRow[] = [
    { label: "Avg Sales Unit Price", actual: actual.AvgUnitPrice, simulated: simulated.AvgUnitPrice, kind: "currency", higherIsBetter: true },
    { label: "Avg Purchase Unit Price", actual: actual.FinalPurPrice, simulated: simulated.FinalPurPrice, kind: "currency", higherIsBetter: false },
    { label: "Total Purchase Cost (Final Unit Cost)", actual: actual.FinalUnitCost, simulated: simulated.FinalUnitCost, kind: "currency", higherIsBetter: false },
    { label: "Cost Ratio", actual: actual.CostRatio, simulated: simulated.CostRatio, kind: "percent", higherIsBetter: false },
    { label: "Gross Margin %", actual: actual.GrossMargin, simulated: simulated.GrossMargin, kind: "percent", higherIsBetter: true },
    { label: "Gross Margin Amount", actual: actualGrossMarginAmount, simulated: simulatedGrossMarginAmount, kind: "currency", higherIsBetter: true },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Every metric, side by side</CardTitle>
        <CardDescription>
          {isNewCustomerQuote ? (
            <>
              <span className="text-primary font-medium">Baseline</span> is an estimated starting
              point from what we already know for this Variety + Warehouse — there&apos;s no real
              sales history for this customer yet.{" "}
            </>
          ) : (
            <>
              <span className="text-primary font-medium">Baseline</span> is the real, unedited row —
              it never changes.{" "}
            </>
          )}
          <span className="text-[var(--chart-2)] font-medium">Scenario</span> moves as you adjust
          inputs above.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Metric</TableHead>
              <TableHead className="text-right text-primary">Baseline</TableHead>
              <TableHead className="text-right text-[var(--chart-2)]">Scenario</TableHead>
              <TableHead className="text-right">Change</TableHead>
              <TableHead className="text-right">% Change</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const d = delta(row.actual, row.simulated);
              const pd = pctDelta(row.actual, row.simulated);
              const fmt = row.kind === "currency" ? formatCurrency : formatPercent;
              const isImprovement = d !== null && d !== 0 && (row.higherIsBetter ? d > 0 : d < 0);
              const isWorse = d !== null && d !== 0 && (row.higherIsBetter ? d < 0 : d > 0);
              return (
                <TableRow key={row.label}>
                  <TableCell className="font-medium">{row.label}</TableCell>
                  <TableCell className="bg-primary/5 text-right font-mono tabular-nums text-foreground/80">{fmt(row.actual)}</TableCell>
                  <TableCell className="bg-[var(--chart-2)]/5 text-right font-mono tabular-nums font-semibold">{fmt(row.simulated)}</TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-mono tabular-nums",
                      isImprovement && "text-success",
                      isWorse && "text-destructive"
                    )}
                  >
                    {d === null ? "—" : `${d > 0 ? "+" : ""}${fmt(d)}`}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-mono tabular-nums",
                      isImprovement && "text-success",
                      isWorse && "text-destructive"
                    )}
                  >
                    {pd === null ? "—" : `${pd > 0 ? "+" : ""}${formatPercent(pd)}`}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
