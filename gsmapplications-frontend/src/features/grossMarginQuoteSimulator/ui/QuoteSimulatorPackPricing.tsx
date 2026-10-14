import { Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { formatCurrency, formatPercent } from "@/shared/lib/format";
import type { SalesRow } from "@/entities/grossMarginSalesRow";
import type { SalesRowMode } from "../model/recompute";

// The rest of the simulator stays in per-unit terms (the unit you negotiate
// with a supplier over); this card answers "what do we invoice THIS
// CUSTOMER for a case?" Mode C (mixed-herb) rows are already whole-pack
// totals, so "quantity" there means "how many cases," not units.
export function QuoteSimulatorPackPricing({
  actual,
  simulated,
  mode,
  quantity,
  onQuantityChange,
}: {
  actual: SalesRow;
  simulated: SalesRow;
  mode: SalesRowMode;
  quantity: number;
  onQuantityChange: (next: number) => void;
}) {
  const isWholePack = mode === "C";
  const packQty = actual.PackQty && actual.PackQty > 0 ? actual.PackQty : null;
  const qty = quantity > 0 ? quantity : 1;

  const totals = (row: SalesRow) => ({
    price: row.AvgUnitPrice !== null ? row.AvgUnitPrice * qty : null,
    cost: row.FinalUnitCost !== null ? row.FinalUnitCost * qty : null,
    margin: row.AvgUnitPrice !== null && row.FinalUnitCost !== null ? (row.AvgUnitPrice - row.FinalUnitCost) * qty : null,
  });
  const baselineTotals = totals(actual);
  const scenarioTotals = totals(simulated);

  const unitWord = isWholePack ? (qty === 1 ? "case" : "cases") : qty === 1 ? "unit" : "units";
  const label = isWholePack ? `Price for ${qty} ${unitWord} of this blend` : `Price for ${qty} ${unitWord}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Package className="size-4.5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle>What do we charge the customer?</CardTitle>
            <CardDescription>
              {isWholePack
                ? "This blend is already priced as one whole pack — quantity here means how many cases."
                : packQty
                  ? `This variety's real case size is ${packQty} units — defaulted below, but editable to any quantity.`
                  : "No case size on file for this variety — set a quantity to quote any lot size."}
            </CardDescription>
          </div>
          <div className="w-28 shrink-0 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Quantity</label>
            <Input
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v) && v > 0) onQuantityChange(v);
              }}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm font-medium text-muted-foreground">{label}</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Baseline</p>
            <div className="mt-2 space-y-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">Sales price</span>
                <span className="font-mono text-lg font-bold tabular-nums text-primary">{formatCurrency(baselineTotals.price)}</span>
              </div>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">Cost</span>
                <span className="font-mono tabular-nums">{formatCurrency(baselineTotals.cost)}</span>
              </div>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">Margin $</span>
                <span className="font-mono tabular-nums">{formatCurrency(baselineTotals.margin)}</span>
              </div>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">Gross Margin %</span>
                <span className="font-mono tabular-nums">{formatPercent(actual.GrossMargin)}</span>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-[var(--chart-2)]/20 bg-[var(--chart-2)]/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--chart-2)]">Scenario</p>
            <div className="mt-2 space-y-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">Sales price</span>
                <span className="font-mono text-lg font-bold tabular-nums text-[var(--chart-2)]">{formatCurrency(scenarioTotals.price)}</span>
              </div>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">Cost</span>
                <span className="font-mono tabular-nums">{formatCurrency(scenarioTotals.cost)}</span>
              </div>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">Margin $</span>
                <span className="font-mono tabular-nums">{formatCurrency(scenarioTotals.margin)}</span>
              </div>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">Gross Margin %</span>
                <span className="font-mono tabular-nums">{formatPercent(simulated.GrossMargin)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
