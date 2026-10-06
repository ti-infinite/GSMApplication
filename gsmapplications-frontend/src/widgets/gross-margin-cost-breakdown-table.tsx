"use client";

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
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Button } from "@/shared/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import { computeCostBreakdown, type Zone } from "@/entities/gross-margin-sales-row";
import { formatCurrency, formatPercent } from "@/shared/lib/format";
import type { SalesRow } from "@/entities/gross-margin-sales-row";
import { cn } from "@/shared/lib/utils";
import { X } from "lucide-react";

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
  unknown: "bg-muted text-muted-foreground",
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
    <Tooltip>
      <TooltipTrigger
        className={cn(
          "flex w-full items-center justify-center rounded-md px-2 py-1.5 font-mono text-sm tabular-nums font-medium cursor-default",
          ZONE_CELL_CLASSES[zone]
        )}
      >
        {formatPercent(value)}
      </TooltipTrigger>
      <TooltipContent>
        {value === null ? "No data available" : comparison}
      </TooltipContent>
    </Tooltip>
  );
}

export function CostBreakdownTable({ rows }: { rows: SalesRow[] }) {
  const [zoneFilter, setZoneFilter] = useState<Zone | "any">("any");
  const [varietyFilter, setVarietyFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("all");

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
            placeholder="Filter Variety…"
            value={varietyFilter}
            onChange={(e) => setVarietyFilter(e.target.value)}
            className="h-8 w-full text-sm sm:w-44"
          />
          <Input
            placeholder="Filter Customer…"
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="h-8 w-full text-sm sm:w-44"
          />
          <Select value={warehouseFilter} onValueChange={(v) => setWarehouseFilter(v ?? "all")}>
            <SelectTrigger className="h-8 w-full text-sm sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All warehouses</SelectItem>
              {warehouses.map((w) => (
                <SelectItem key={w} value={w}>
                  {w}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={zoneFilter} onValueChange={(v) => setZoneFilter((v ?? "any") as Zone | "any")}>
            <SelectTrigger className="h-8 w-full text-sm sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ZONE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <div className="rounded-lg border">
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
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
                  {filtered.map(({ row, breakdown }, i) => (
                    <TableRow key={i}>
                      <TableCell className="max-w-64 whitespace-normal">{row.Variety}</TableCell>
                      <TableCell className="whitespace-nowrap">{row.Customer}</TableCell>
                      <TableCell className="whitespace-nowrap">{row.Warehouse}</TableCell>
                      <TableCell className="whitespace-nowrap text-right font-mono tabular-nums">
                        {formatCurrency(row.AvgUnitPrice)}
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
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
