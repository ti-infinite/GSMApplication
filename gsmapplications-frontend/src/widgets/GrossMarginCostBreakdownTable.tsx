import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
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
import { X, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

const ZONE_OPTIONS: { value: Zone | "any"; label: string }[] = [
  { value: "any", label: "Any zone" },
  { value: "red", label: "Red — over threshold" },
  { value: "yellow", label: "Yellow — approaching threshold" },
  { value: "green", label: "Green — healthy" },
  { value: "unknown", label: "No data" },
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
  const comparison = isFloor
    ? `Floor: ${formatPercent(threshold)} minimum`
    : `Threshold: ${formatPercent(threshold)} maximum`;

  return (
    <div
      title={value === null ? "No data available" : comparison}
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

  const categoryLabels = enriched[0]?.breakdown.map((c) => c.label) ?? [];

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
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base">
          Cost breakdown — {filtered.length} row{filtered.length === 1 ? "" : "s"}
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Filter varieties…"
            value={varietyFilter}
            onChange={(e) => setVarietyFilter(e.target.value)}
            className="h-8 w-full text-sm sm:w-44"
          />
          <Input
            placeholder="Filter customers…"
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="h-8 w-full text-sm sm:w-44"
          />
          <div className="w-full sm:w-36">
            <Combobox
              size="sm"
              value={warehouseFilter}
              onChange={(v) => setWarehouseFilter(v || "all")}
              options={[
                { value: "all", label: "All warehouses" },
                ...warehouses.map((w) => ({ value: w, label: w })),
              ]}
            />
          </div>
          <div className="w-full sm:w-56">
            <Combobox
              size="sm"
              value={zoneFilter}
              onChange={(v) => setZoneFilter((v || "any") as Zone | "any")}
              options={ZONE_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
            />
          </div>
          {hasActiveFilters && (
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
              Reset
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-success" /> Healthy
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-warning" /> Approaching threshold
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-destructive" /> Over threshold
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-muted-foreground/40" /> No data
          </span>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
            {summary.redRows} over threshold
          </span>
          <span className="rounded-full bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
            {summary.yellowOnly} approaching
          </span>
          <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
            {summary.healthy} fully healthy
          </span>
        </div>

        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No rows match the current filters.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-card">
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Variety</TableHead>
                    <TableHead className="whitespace-nowrap">Customer</TableHead>
                    <TableHead className="whitespace-nowrap">Warehouse</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Avg Unit Price</TableHead>
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
                <span>Rows per page</span>
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
                      aria-label="Previous"
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="px-1 text-muted-foreground">{safePage + 1} / {pageCount}</span>
                    <button
                      type="button"
                      disabled={safePage >= pageCount - 1}
                      onClick={() => setPage(safePage + 1)}
                      aria-label="Next"
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
