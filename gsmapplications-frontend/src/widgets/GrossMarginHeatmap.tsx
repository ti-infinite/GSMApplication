import { useEffect, useState } from "react";
import { formatCurrency, formatPercent } from "@/shared/lib/format";
import { cellKey, type RankMetric } from "@/entities/grossMarginSalesRow";
import { Button } from "@/shared/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

const DEFAULT_VISIBLE = 20;
const SHOW_MORE_STEP = 20;

// Metric-aware color semantics: GrossMargin/CostRatio have a "good/bad"
// direction (green=good, red=bad), AvgUnitPrice doesn't (neutral blue scale
// by intensity only). Per ui-ux-pro-max chart guidance: heatmaps need a
// visible legend and numeric value per cell, never color-only.
function cellColor(metric: RankMetric, value: number | null, min: number, max: number): string {
  if (value === null) return "var(--color-muted)";
  const range = max - min || 1;
  const t = Math.min(1, Math.max(0, (value - min) / range));

  if (metric === "AvgUnitPrice") {
    // Neutral sequential: light -> deep primary blue.
    const lightness = 92 - t * 55;
    return `oklch(${lightness}% 0.08 258)`;
  }

  // CostRatio: low(good)=green, high(bad)=red. GrossMargin: inverse.
  const goodAtLow = metric === "CostRatio";
  const goodness = goodAtLow ? 1 - t : t;
  // hue 145 = green, hue 25 = red
  const hue = 25 + goodness * 120;
  const lightness = 88 - Math.abs(goodness - 0.5) * 2 * 28;
  return `oklch(${lightness}% 0.13 ${hue})`;
}

export function Heatmap({
  varieties,
  customers,
  cells,
  metric,
}: {
  varieties: string[];
  customers: string[];
  cells: Map<string, number | null>;
  metric: RankMetric;
}) {
  const values = Array.from(cells.values()).filter((v): v is number => v !== null);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const formatValue = metric === "AvgUnitPrice" ? formatCurrency : formatPercent;

  // Only a slice of varieties renders at once -- the full cross product
  // (241 varieties x 71 customers here) is ~17k cells, enough to freeze the
  // tab on its own regardless of how many are actually empty. Resets
  // whenever the caller hands a genuinely different ranking (new metric/filter).
  const [visibleCount, setVisibleCount] = useState(DEFAULT_VISIBLE);
  useEffect(() => setVisibleCount(DEFAULT_VISIBLE), [varieties]);

  if (varieties.length === 0 || customers.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        No data to display.
      </div>
    );
  }

  const visibleVarieties = varieties.slice(0, visibleCount);
  const remaining = varieties.length - visibleVarieties.length;
  // Dropping columns with zero data among the varieties actually on screen
  // shrinks the other axis too, for free -- bounded by visibleVarieties.length
  // x customers.length (at most ~1.4k checks at the default 20), not the
  // full matrix.
  const visibleCustomers = customers.filter((customer) =>
    visibleVarieties.some((variety) => (cells.get(cellKey(variety, customer)) ?? null) !== null)
  );

  if (visibleCustomers.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        No data for the customers currently shown — try clearing the customer filter.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{formatValue(min)}</span>
        <div
          className="h-2 w-32 rounded-full"
          style={{
            background:
              metric === "AvgUnitPrice"
                ? `linear-gradient(to right, ${cellColor(metric, min, min, max)}, ${cellColor(metric, max, min, max)})`
                : metric === "CostRatio"
                ? "linear-gradient(to right, oklch(80% 0.13 145), oklch(80% 0.13 25))"
                : "linear-gradient(to right, oklch(80% 0.13 25), oklch(80% 0.13 145))",
          }}
        />
        <span>{formatValue(max)}</span>
        <span className="ml-2">({metric === "AvgUnitPrice" ? "price scale" : metric === "CostRatio" ? "green = better (lower)" : "green = better (higher)"})</span>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <div className="overflow-x-auto">
          {/* A real <table>, not a CSS grid -- position:sticky on a grid
              item detaches from the viewport past a few hundred px of
              horizontal scroll (a known Chromium/grid limitation), while
              sticky table cells (same pattern as Sales Explorer/Cost
              Breakdown) stay pinned for the full scroll range. */}
          <Table scrollContainer={false} className="border-separate border-spacing-0 text-xs">
            <TableHeader className="bg-card">
              <TableRow>
                <TableHead className="sticky left-0 z-10 min-w-50 border-r border-b bg-card p-2" />
                {visibleCustomers.map((customer) => (
                  <TableHead
                    key={customer}
                    className="min-w-18 border-b p-2 text-center font-medium text-muted-foreground"
                    title={customer}
                  >
                    <span className="line-clamp-2 leading-tight whitespace-normal">{customer}</span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleVarieties.map((variety) => (
                <TableRow key={variety}>
                  <TableCell
                    className="sticky left-0 z-10 min-w-50 border-r bg-card p-2 font-medium whitespace-normal"
                    title={variety}
                  >
                    <span className="line-clamp-2 leading-tight">{variety}</span>
                  </TableCell>
                  {visibleCustomers.map((customer) => {
                    const value = cells.get(cellKey(variety, customer)) ?? null;
                    return (
                      <TableCell
                        key={`${variety}-${customer}`}
                        title={`${variety} × ${customer}: ${value !== null ? formatValue(value) : "no data"}`}
                        className="h-12 min-w-18 cursor-default p-0 text-center font-mono tabular-nums"
                        style={{ background: cellColor(metric, value, min, max) }}
                      >
                        {value !== null ? (
                          <span className="text-[10px] text-foreground/80">
                            {metric === "AvgUnitPrice" ? formatCurrency(value) : formatPercent(value)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {remaining > 0 && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVisibleCount((c) => c + SHOW_MORE_STEP)}
          >
            Show {Math.min(SHOW_MORE_STEP, remaining)} more ({remaining} left)
          </Button>
        </div>
      )}
    </div>
  );
}
