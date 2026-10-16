import { ArrowRight, CheckCircle2, AlertTriangle, XCircle, HelpCircle, Minus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatPercent } from "@/shared/lib/format";
import { grossMarginCellZone, type Zone } from "@/entities/grossMarginSalesRow";
import type { SalesRow } from "@/entities/grossMarginSalesRow";
import { cn } from "@/shared/lib/utils";

// One glance answers "did this scenario help or hurt?" -- Baseline and
// Scenario sit side by side using the same zone coloring (green/yellow/red)
// as the rest of the dashboard.
const ZONE_META: Record<Zone, { icon: typeof CheckCircle2; classes: string }> = {
  green: { icon: CheckCircle2, classes: "bg-success/10 text-success" },
  yellow: { icon: AlertTriangle, classes: "bg-warning/10 text-warning" },
  red: { icon: XCircle, classes: "bg-destructive/10 text-destructive" },
  unknown: { icon: HelpCircle, classes: "bg-muted text-muted-foreground" },
};

function MarginBlock({
  label,
  sublabel,
  value,
  tone,
}: {
  label: string;
  sublabel: string;
  value: number | null;
  tone: "primary" | "chart-2";
}) {
  const { t } = useTranslation();
  const zone = grossMarginCellZone(value);
  const meta = ZONE_META[zone];
  const ZoneIcon = meta.icon;
  const toneClasses = tone === "primary" ? "text-primary" : "text-[var(--chart-2)]";
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("font-mono text-5xl font-bold tabular-nums", toneClasses)}>{formatPercent(value)}</p>
      <p className="text-xs text-muted-foreground">{sublabel}</p>
      <span className={cn("mt-1 flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium", meta.classes)}>
        <ZoneIcon className="size-3.5" aria-hidden="true" />
        {t(`grossMargin.simulator.headline.zones.${zone}`)}
      </span>
    </div>
  );
}

export function QuoteSimulatorHeadline({
  actual,
  simulated,
  isNewCustomerQuote,
}: {
  actual: SalesRow;
  simulated: SalesRow;
  isNewCustomerQuote?: boolean;
}) {
  const { t } = useTranslation();
  const d =
    actual.GrossMargin !== null && simulated.GrossMargin !== null ? simulated.GrossMargin - actual.GrossMargin : null;
  const improved = d !== null && d > 1e-9;
  const worsened = d !== null && d < -1e-9;

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-[var(--chart-2)]/10 p-6 shadow-sm sm:p-8">
      <p className="mb-5 text-center text-sm font-medium text-muted-foreground sm:mb-6">
        {isNewCustomerQuote ? t("grossMargin.simulator.headline.estimate") : t("grossMargin.simulator.headline.actual")}
      </p>
      <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
        <MarginBlock
          label={t("grossMargin.simulator.headline.baseline")}
          sublabel={isNewCustomerQuote ? t("grossMargin.simulator.headline.baselineSubEstimate") : t("grossMargin.simulator.headline.baselineSubActual")}
          value={actual.GrossMargin}
          tone="primary"
        />

        <div className="flex flex-col items-center gap-1.5 px-2">
          <ArrowRight className="size-6 shrink-0 rotate-90 text-muted-foreground sm:rotate-0" aria-hidden="true" />
          {d !== null && (
            <span
              className={cn(
                "flex items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1 font-mono text-xs font-semibold tabular-nums",
                improved && "bg-success/10 text-success",
                worsened && "bg-destructive/10 text-destructive",
                !improved && !worsened && "bg-muted text-muted-foreground"
              )}
            >
              {improved && "+"}
              {formatPercent(d)}
              {!improved && !worsened && <Minus className="size-3" aria-hidden="true" />}
            </span>
          )}
        </div>

        <MarginBlock label={t("grossMargin.simulator.headline.scenario")} sublabel={t("grossMargin.simulator.headline.scenarioSub")} value={simulated.GrossMargin} tone="chart-2" />
      </div>
    </div>
  );
}
