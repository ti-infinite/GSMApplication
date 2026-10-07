import { Fragment } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import { formatCurrency, formatPercent } from "@/shared/lib/format";
import { cellKey, type RankMetric } from "@/entities/grossMarginSalesRow";

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

  if (varieties.length === 0 || customers.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        No data to display.
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

      <div className="overflow-x-auto">
        <div
          className="grid gap-px bg-border text-xs"
          style={{
            gridTemplateColumns: `200px repeat(${customers.length}, minmax(72px, 1fr))`,
          }}
        >
          <div className="sticky left-0 z-10 bg-card p-2" />
          {customers.map((customer) => (
            <div
              key={customer}
              className="bg-card p-2 text-center font-medium text-muted-foreground"
              title={customer}
            >
              <span className="line-clamp-2 leading-tight">{customer}</span>
            </div>
          ))}
          {varieties.map((variety) => (
            <Fragment key={variety}>
              <div
                className="sticky left-0 z-10 bg-card p-2 font-medium"
                title={variety}
              >
                <span className="line-clamp-2 leading-tight">{variety}</span>
              </div>
              {customers.map((customer) => {
                const value = cells.get(cellKey(variety, customer)) ?? null;
                return (
                  <Tooltip key={`${variety}-${customer}`}>
                    <TooltipTrigger
                      className="flex h-12 w-full cursor-default items-center justify-center p-0 font-mono tabular-nums"
                      style={{ background: cellColor(metric, value, min, max) }}
                    >
                      {value !== null ? (
                        <span className="text-[10px] text-foreground/80">
                          {metric === "AvgUnitPrice" ? formatCurrency(value) : formatPercent(value)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </TooltipTrigger>
                    <TooltipContent>
                      {variety} × {customer}: {value !== null ? formatValue(value) : "no data"}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
