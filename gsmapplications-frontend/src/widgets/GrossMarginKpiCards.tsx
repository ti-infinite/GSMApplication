import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { formatPercent } from "@/shared/lib/format";
import { computeOverviewStats, aggregateByVariety, type SalesRow } from "@/entities/grossMarginSalesRow";
import { cn } from "@/shared/lib/utils";
import {
  PackageSearch,
  Users,
  Warehouse,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

// Each stat gets its own semantic-token color theme (never raw hex) so the
// Overview reads as distinct, colorful signals rather than one flat gray
// grid -- ui-ux-pro-max: color-not-only still holds, every card also carries
// an icon + label, color is reinforcement, not the only signal.
type Theme = "primary" | "success" | "warning" | "destructive" | "chart-2" | "chart-3" | "chart-5";

const THEME_CLASSES: Record<Theme, { bg: string; text: string; ring: string }> = {
  primary: { bg: "bg-primary/10", text: "text-primary", ring: "ring-primary/15" },
  success: { bg: "bg-success/10", text: "text-success", ring: "ring-success/15" },
  warning: { bg: "bg-warning/10", text: "text-warning", ring: "ring-warning/15" },
  destructive: { bg: "bg-destructive/10", text: "text-destructive", ring: "ring-destructive/15" },
  "chart-2": { bg: "bg-[var(--chart-2)]/10", text: "text-[var(--chart-2)]", ring: "ring-[var(--chart-2)]/15" },
  "chart-3": { bg: "bg-[var(--chart-3)]/10", text: "text-[var(--chart-3)]", ring: "ring-[var(--chart-3)]/15" },
  "chart-5": { bg: "bg-[var(--chart-5)]/10", text: "text-[var(--chart-5)]", ring: "ring-[var(--chart-5)]/15" },
};

function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  theme,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  sublabel?: string;
  theme: Theme;
}) {
  const theme_ = THEME_CLASSES[theme];
  return (
    <div
      className={cn(
        "relative flex min-h-40 flex-col overflow-hidden rounded-xl border bg-card px-5 py-4 shadow-sm ring-1 transition-all hover:-translate-y-0.5 hover:shadow-md",
        theme_.ring
      )}
    >
      {/* Same treatment as the home screen's QuickCards: one large icon
          anchored to the bottom-right corner, tinted with the card's theme. */}
      <Icon
        className={cn("pointer-events-none absolute -bottom-3 -right-3 size-24 opacity-20", theme_.text)}
        aria-hidden="true"
      />
      <p className="relative text-sm font-medium text-muted-foreground">{label}</p>
      <p className={cn("relative mt-1 font-mono text-3xl font-bold tabular-nums", theme_.text)}>
        {value}
      </p>
      {sublabel && <p className="relative mt-1 text-xs text-muted-foreground">{sublabel}</p>}
    </div>
  );
}

function RankedList({
  title,
  icon: Icon,
  theme,
  items,
}: {
  title: string;
  icon: typeof TrendingUp;
  theme: Theme;
  items: { name: string; sub: string; value: number | null }[];
}) {
  const { t } = useTranslation();
  const theme_ = THEME_CLASSES[theme];
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className={cn("flex size-8 items-center justify-center rounded-lg", theme_.bg, theme_.text)}>
          <Icon className="size-4" aria-hidden="true" />
        </div>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={item.name + i} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[0.65rem] font-semibold text-muted-foreground">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium">{item.name}</p>
                <p className="truncate text-xs text-muted-foreground">{item.sub}</p>
              </div>
            </div>
            <span className={cn("shrink-0 font-mono text-sm font-semibold tabular-nums", theme_.text)}>
              {formatPercent(item.value)}
            </span>
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-sm text-muted-foreground">{t("grossMargin.common.noData")}</li>
        )}
      </ul>
    </div>
  );
}

export function KpiCards({ rows }: { rows: SalesRow[] }) {
  const { t } = useTranslation();
  const stats = useMemo(() => computeOverviewStats(rows), [rows]);
  const healthyPct =
    stats.totalRows > 0
      ? ((stats.totalRows - stats.rowsInAnyAlarm) / stats.totalRows)
      : null;

  const varietyRanking = useMemo(() => {
    const withMargin = aggregateByVariety(rows).filter((v) => v.grossMargin !== null);
    const sorted = [...withMargin].sort((a, b) => (b.grossMargin ?? 0) - (a.grossMargin ?? 0));
    return { top: sorted.slice(0, 5), bottom: sorted.slice(-5).reverse() };
  }, [rows]);

  return (
    <div className="space-y-6">
      <div
        className={cn(
          "flex flex-col gap-2 rounded-2xl border p-6 sm:flex-row sm:items-center sm:justify-between",
          "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            {stats.avgGrossMargin !== null && stats.avgGrossMargin >= 0 ? (
              <TrendingUp className="size-6" aria-hidden="true" />
            ) : (
              <TrendingDown className="size-6" aria-hidden="true" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t("grossMargin.dashboard.kpi.avgGrossMargin")}</p>
            <p className="font-mono text-4xl font-bold tabular-nums text-primary">
              {formatPercent(stats.avgGrossMargin)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("grossMargin.dashboard.kpi.acrossRows", { count: stats.totalRows })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {stats.rowsInAnyAlarm === 0 ? (
            <span className="flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1.5 font-medium text-success">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              {t("grossMargin.dashboard.kpi.allWithinLimits", { count: stats.totalRows })}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1.5 font-medium text-destructive">
              <AlertTriangle className="size-4" aria-hidden="true" />
              {t("grossMargin.dashboard.kpi.breaching", { alarm: stats.rowsInAnyAlarm, total: stats.totalRows })}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          icon={PackageSearch}
          label={t("grossMargin.dashboard.kpi.varietiesTracked")}
          value={String(stats.distinctVarieties)}
          theme="primary"
        />
        <StatCard
          icon={Users}
          label={t("grossMargin.dashboard.kpi.customers")}
          value={String(stats.distinctCustomers)}
          theme="chart-3"
        />
        <StatCard
          icon={Warehouse}
          label={t("grossMargin.dashboard.kpi.warehouses")}
          value={String(stats.distinctWarehouses)}
          theme="chart-5"
        />
        <StatCard
          icon={ShoppingBag}
          label={t("grossMargin.dashboard.kpi.avgPurchaseCost")}
          value={formatPercent(stats.avgPurchaseCostRatio)}
          sublabel={t("grossMargin.dashboard.kpi.ofSalePrice")}
          theme="chart-2"
        />
        <StatCard
          icon={TrendingDown}
          label={t("grossMargin.dashboard.kpi.avgCostRatio")}
          value={formatPercent(stats.avgCostRatio)}
          sublabel={t("grossMargin.dashboard.kpi.ofSalePrice")}
          theme="warning"
        />
        <StatCard
          icon={AlertTriangle}
          label={t("grossMargin.dashboard.kpi.rowsWithAlarm")}
          value={`${stats.rowsInAnyAlarm} / ${stats.totalRows}`}
          sublabel={healthyPct !== null ? t("grossMargin.dashboard.kpi.healthy", { pct: formatPercent(healthyPct) }) : undefined}
          theme={stats.rowsInAnyAlarm > 0 ? "destructive" : "success"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RankedList
          title={t("grossMargin.dashboard.kpi.bestMargin")}
          icon={ArrowUpRight}
          theme="success"
          items={varietyRanking.top.map((v) => ({
            name: v.key,
            sub: `${v.calculatedSKU} · ${t("grossMargin.common.rowCount", { count: v.rowCount })}`,
            value: v.grossMargin,
          }))}
        />
        <RankedList
          title={t("grossMargin.dashboard.kpi.lowestMargin")}
          icon={ArrowDownRight}
          theme="destructive"
          items={varietyRanking.bottom.map((v) => ({
            name: v.key,
            sub: `${v.calculatedSKU} · ${t("grossMargin.common.rowCount", { count: v.rowCount })}`,
            value: v.grossMargin,
          }))}
        />
      </div>

      {stats.warehouseStats.length > 0 && (
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold">{t("grossMargin.dashboard.kpi.byWarehouse")}</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {stats.warehouseStats.map((w) => (
              <div key={w.warehouse} className="rounded-xl bg-muted/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-semibold">{w.warehouse}</span>
                  <span className="text-xs text-muted-foreground">
                    {t("grossMargin.common.rowCount", { count: w.rowCount })}
                  </span>
                </div>
                <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-primary">
                  {formatPercent(w.avgGrossMargin)}
                </p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${Math.max(0, Math.min(100, ((w.avgGrossMargin ?? 0) / 0.6) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
