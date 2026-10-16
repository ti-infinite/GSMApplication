import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Field } from "@/shared/ui/field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Combobox } from "@/shared/ui/combobox";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/shared/ui/dropdown-menu";
import { computeCostBreakdown, type Zone } from "@/entities/grossMarginSalesRow";
import { formatCurrency, formatPercent } from "@/shared/lib/format";
import { EMPTY_CELL_CLASSES } from "@/shared/lib/emptyCellStyles";
import type { SalesRow } from "@/entities/grossMarginSalesRow";
import { cn } from "@/shared/lib/utils";
import { THRESHOLD_LABELS } from "@/shared/lib/thresholds";
import { X, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

const ZONE_OPTIONS: { value: Zone | "any"; labelKey: string }[] = [
  { value: "any", labelKey: "statusAny" },
  { value: "red", labelKey: "statusOver" },
  { value: "yellow", labelKey: "statusClose" },
  { value: "green", labelKey: "statusWithin" },
  { value: "unknown", labelKey: "statusNoData" },
];

// Cell background/text driven entirely by semantic tokens (never raw hex),
// so this stays a values-only edit if the brand palette changes again.
const ZONE_CELL_CLASSES: Record<Zone, string> = {
  green: "bg-success/15 text-success",
  yellow: "bg-warning/15 text-warning",
  red: "bg-destructive/15 text-destructive",
  unknown: "border border-border bg-muted text-muted-foreground",
};

function ZoneCell({
  value,
  threshold,
  isFloor,
  zone,
}: {
  value: number | null;
  threshold: number;
  isFloor: boolean;
  zone: Zone;
}) {
  const { t } = useTranslation();
  const comparison = isFloor
    ? t("grossMargin.alarms.floor", { value: formatPercent(threshold) })
    : t("grossMargin.alarms.threshold", { value: formatPercent(threshold) });

  return (
    <div
      title={value === null ? t("grossMargin.dashboard.breakdown.noDataAvailable") : comparison}
      className={cn(
        "flex w-full items-center justify-center rounded-md px-2 py-1.5 font-mono text-sm tabular-nums font-medium cursor-default",
        ZONE_CELL_CLASSES[zone]
      )}
    >
      {formatPercent(value)}
    </div>
  );
}

export function CostBreakdownTable({ rows }: { rows: SalesRow[] }) {
  const { t } = useTranslation();
  const [zoneFilter, setZoneFilter] = useState<Zone | "any">("any");
  const [varietyFilter, setVarietyFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(PAGE_SIZE_OPTIONS[0]);

  const warehouses = useMemo(
    () => Array.from(new Set(rows.map((r) => r.Warehouse))).sort(),
    [rows]
  );

  const enriched = useMemo(
    () => rows.map((row) => ({ row, breakdown: computeCostBreakdown(row) })),
    [rows]
  );

  const filtered = useMemo(() => {
    return enriched
      .filter(({ row }) => {
        if (varietyFilter && !row.Variety.toLowerCase().includes(varietyFilter.toLowerCase()))
          return false;
        if (customerFilter && !row.Customer.toLowerCase().includes(customerFilter.toLowerCase()))
          return false;
        if (warehouseFilter !== "all" && row.Warehouse !== warehouseFilter) return false;
        return true;
      })
      .filter(({ breakdown }) =>
        zoneFilter === "any" ? true : breakdown.some((c) => c.zone === zoneFilter)
      )
      .sort((a, b) => {
        const worst = (cats: typeof a.breakdown) =>
          cats.filter((c) => c.zone === "red").length * 2 +
          cats.filter((c) => c.zone === "yellow").length;
        return worst(b.breakdown) - worst(a.breakdown);
      });
  }, [enriched, varietyFilter, customerFilter, warehouseFilter, zoneFilter]);

  const categoryLabels = enriched[0]?.breakdown.map((c) => t(`grossMargin.alarms.categories.${c.key}`)) ?? [];

  // Paginated, not virtualized -- consistent with Sales Explorer, this
  // caps how much the table ever mounts at once instead of relying on
  // windowed scroll.
  const pageCount = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const safePage = Math.min(page, pageCount - 1);
  const paged = filtered.slice(safePage * rowsPerPage, safePage * rowsPerPage + rowsPerPage);

  const summary = useMemo(() => {
    let redRows = 0;
    let yellowOnly = 0;
    let healthy = 0;
    for (const { breakdown } of filtered) {
      if (breakdown.some((c) => c.zone === "red")) redRows++;
      else if (breakdown.some((c) => c.zone === "yellow")) yellowOnly++;
      else healthy++;
    }
    return { redRows, yellowOnly, healthy };
  }, [filtered]);

  const hasActiveFilters =
    zoneFilter !== "any" || varietyFilter !== "" || customerFilter !== "" || warehouseFilter !== "all";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("grossMargin.dashboard.breakdown.title")}</CardTitle>
        {hasActiveFilters && (
          <CardAction>
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => {
                setZoneFilter("any");
                setVarietyFilter("");
                setCustomerFilter("");
                setWarehouseFilter("all");
              }}
            >
              <X aria-hidden="true" />
              {t("grossMargin.dashboard.breakdown.reset")}
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t("grossMargin.common.fields.variety")}>
            <Input
              placeholder={t("grossMargin.common.search")}
              value={varietyFilter}
              onChange={(e) => setVarietyFilter(e.target.value)}
            />
          </Field>
          <Field label={t("grossMargin.common.fields.customer")}>
            <Input
              placeholder={t("grossMargin.common.search")}
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
            />
          </Field>
          <Field label={t("grossMargin.common.fields.warehouse")}>
            <Combobox
              value={warehouseFilter}
              onChange={(v) => setWarehouseFilter(v || "all")}
              options={[
                { value: "all", label: t("grossMargin.common.allWarehouses") },
                ...warehouses.map((w) => ({ value: w, label: w })),
              ]}
            />
          </Field>
          <Field label={t("grossMargin.dashboard.breakdown.status")}>
            <Combobox
              value={zoneFilter}
              onChange={(v) => setZoneFilter((v || "any") as Zone | "any")}
              options={ZONE_OPTIONS.map((opt) => ({ value: opt.value, label: t(`grossMargin.dashboard.breakdown.${opt.labelKey}`) }))}
            />
          </Field>
        </div>

        <p className="mb-2 text-xs text-muted-foreground">
          {t("grossMargin.dashboard.breakdown.limits", {
            purchase: THRESHOLD_LABELS.purchaseCost,
            packing: THRESHOLD_LABELS.packing,
            labour: THRESHOLD_LABELS.labour,
            transport: THRESHOLD_LABELS.transport,
            margin: THRESHOLD_LABELS.margin,
            band: THRESHOLD_LABELS.amberBand,
          })}
        </p>

        <div className="mb-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
            {t("grossMargin.dashboard.breakdown.pillOver", { count: summary.redRows })}
          </span>
          <span className="rounded-full bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
            {t("grossMargin.dashboard.breakdown.pillClose", { count: summary.yellowOnly })}
          </span>
          <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
            {t("grossMargin.dashboard.breakdown.pillWithin", { count: summary.healthy })}
          </span>
        </div>

        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("grossMargin.dashboard.breakdown.noRowsMatch")}
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-card">
                  <TableRow>
                    <TableHead className="whitespace-nowrap">{t("grossMargin.common.fields.variety")}</TableHead>
                    <TableHead className="whitespace-nowrap">{t("grossMargin.common.fields.customer")}</TableHead>
                    <TableHead className="whitespace-nowrap">{t("grossMargin.common.fields.warehouse")}</TableHead>
                    <TableHead className="whitespace-nowrap text-right">{t("grossMargin.dashboard.salesExplorer.columns.avgUnitPrice")}</TableHead>
                    {categoryLabels.map((label) => (
                      <TableHead key={label} className="min-w-32 whitespace-nowrap text-center">
                        {label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map(({ row, breakdown }, i) => (
                    <TableRow key={i}>
                      <TableCell className="max-w-64 whitespace-normal">{row.Variety}</TableCell>
                      <TableCell className="whitespace-nowrap">{row.Customer}</TableCell>
                      <TableCell className="whitespace-nowrap">{row.Warehouse}</TableCell>
                      <TableCell className="whitespace-nowrap text-right font-mono tabular-nums">
                        <span className={cn(row.AvgUnitPrice === null && EMPTY_CELL_CLASSES)}>
                          {formatCurrency(row.AvgUnitPrice)}
                        </span>
                      </TableCell>
                      {breakdown.map((cat) => (
                        <TableCell key={cat.key} className="p-1">
                          <ZoneCell
                            value={cat.value}
                            threshold={cat.threshold}
                            isFloor={cat.isFloor}
                            zone={cat.zone}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-4 py-1 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>{t("grossMargin.common.rowsPerPage")}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {rowsPerPage} <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-20">
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <DropdownMenuItem key={n} onSelect={() => { setRowsPerPage(n); setPage(0); }}>
                        {n}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">
                  {safePage * rowsPerPage + 1}–{Math.min(filtered.length, (safePage + 1) * rowsPerPage)} / {filtered.length}
                </span>
                {pageCount > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={safePage === 0}
                      onClick={() => setPage(safePage - 1)}
                      aria-label={t("grossMargin.common.previous")}
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="px-1 text-muted-foreground">{safePage + 1} / {pageCount}</span>
                    <button
                      type="button"
                      disabled={safePage >= pageCount - 1}
                      onClick={() => setPage(safePage + 1)}
                      aria-label={t("grossMargin.common.next")}
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted disabled:opacity-40"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
