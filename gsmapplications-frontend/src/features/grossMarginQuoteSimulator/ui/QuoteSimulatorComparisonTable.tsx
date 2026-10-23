import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const R = (key: string) => t(`grossMargin.simulator.comparison.rows.${key}`);
  const actualGrossMarginAmount =
    actual.AvgUnitPrice !== null && actual.FinalUnitCost !== null ? actual.AvgUnitPrice - actual.FinalUnitCost : null;
  const simulatedGrossMarginAmount =
    simulated.AvgUnitPrice !== null && simulated.FinalUnitCost !== null
      ? simulated.AvgUnitPrice - simulated.FinalUnitCost
      : null;

  const rows: MetricRow[] = [
    { label: R("salesPrice"), actual: actual.AvgUnitPrice, simulated: simulated.AvgUnitPrice, kind: "currency", higherIsBetter: true },
    { label: R("purchasePrice"), actual: actual.FinalPurPrice, simulated: simulated.FinalPurPrice, kind: "currency", higherIsBetter: false },
    { label: R("finalUnitCost"), actual: actual.FinalUnitCost, simulated: simulated.FinalUnitCost, kind: "currency", higherIsBetter: false },
    { label: R("costRatio"), actual: actual.CostRatio, simulated: simulated.CostRatio, kind: "percent", higherIsBetter: false },
    { label: R("grossMarginPct"), actual: actual.GrossMargin, simulated: simulated.GrossMargin, kind: "percent", higherIsBetter: true },
    { label: R("grossMarginAmount"), actual: actualGrossMarginAmount, simulated: simulatedGrossMarginAmount, kind: "currency", higherIsBetter: true },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("grossMargin.simulator.comparison.title")}</CardTitle>
        <CardDescription>
          {isNewCustomerQuote
            ? t("grossMargin.simulator.comparison.descriptionEstimate")
            : t("grossMargin.simulator.comparison.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("grossMargin.simulator.comparison.metric")}</TableHead>
              <TableHead className="text-right text-primary">{t("grossMargin.simulator.comparison.baseline")}</TableHead>
              <TableHead className="text-right text-[var(--chart-2)]">{t("grossMargin.simulator.comparison.scenario")}</TableHead>
              <TableHead className="text-right">{t("grossMargin.simulator.comparison.change")}</TableHead>
              <TableHead className="text-right">{t("grossMargin.simulator.comparison.pctChange")}</TableHead>
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
