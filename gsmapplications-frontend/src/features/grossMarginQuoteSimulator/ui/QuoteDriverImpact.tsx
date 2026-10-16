import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { formatCurrency, formatPercent } from "@/shared/lib/format";
import { formatByFieldFormat } from "../model/quoteFields";
import { buildDriverImpacts, type QuoteOverrides, type RecomputeInputs, type SalesRowMode } from "../model/recompute";
import { useQuoteFields } from "../model/useQuoteFields";
import { cn } from "@/shared/lib/utils";

// Each active override's own effect on Gross Margin, isolated from the
// others, so "what's moving my margin" reads as a flat ranked list.
export function QuoteDriverImpact({
  mode,
  commissionType,
  inputs,
  overrides,
}: {
  mode: SalesRowMode;
  commissionType: "percent" | "value" | null;
  inputs: RecomputeInputs;
  overrides: QuoteOverrides;
}) {
  const { t } = useTranslation();
  const fields = useQuoteFields(commissionType, mode);
  const impacts = useMemo(() => buildDriverImpacts(inputs, overrides, fields), [inputs, overrides, fields]);

  const maxAbs = Math.max(0.001, ...impacts.map((i) => Math.abs(i.marginAmountDelta ?? 0)));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("grossMargin.simulator.drivers.title")}</CardTitle>
        <CardDescription>
          {t("grossMargin.simulator.drivers.description")} {impacts.length > 1 && t("grossMargin.simulator.drivers.interaction")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {impacts.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("grossMargin.simulator.drivers.empty")}
          </p>
        ) : (
          <div className="space-y-2">
            {impacts.map((d) => {
              const amount = d.marginAmountDelta ?? 0;
              const positive = amount >= 0;
              const widthPct = Math.min(100, (Math.abs(amount) / maxAbs) * 100);
              return (
                <div key={d.key} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                  <div
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg",
                      positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                    )}
                  >
                    {positive ? <TrendingUp className="size-4" aria-hidden="true" /> : <TrendingDown className="size-4" aria-hidden="true" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-medium">{d.label}</p>
                      <p className={cn("shrink-0 font-mono text-sm font-semibold tabular-nums", positive ? "text-success" : "text-destructive")}>
                        {positive ? "+" : ""}
                        {formatCurrency(amount)}
                        {d.grossMarginPctDelta !== null && (
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            ({positive ? "+" : ""}
                            {formatPercent(d.grossMarginPctDelta)})
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full", positive ? "bg-success" : "bg-destructive")}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatByFieldFormat(d.format, d.baselineValue)} → {formatByFieldFormat(d.format, d.currentValue)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
