"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { RankedBarChart, type RankedBarDatum } from "@/shared/ui/ranked-bar-chart";
import { StatChips } from "@/shared/ui/stat-chips";
import { aggregateByVariety } from "@/shared/lib/aggregate";
import type { SalesRow } from "@/entities/gross-margin-sales-row";
import { Search } from "lucide-react";

function toBarData(
  aggs: ReturnType<typeof aggregateByVariety>,
  field: "avgUnitPrice" | "costRatio" | "grossMargin",
  direction: "asc" | "desc"
): RankedBarDatum[] {
  return aggs
    .filter((a) => a[field] !== null)
    .sort((a, b) => (direction === "desc" ? (b[field]! - a[field]!) : (a[field]! - b[field]!)))
    .map((a) => ({ label: a.key, value: a[field] }));
}

export function VarietyRankingCharts({ rows }: { rows: SalesRow[] }) {
  const [search, setSearch] = useState("");
  const [warehouse, setWarehouse] = useState("all");

  const warehouses = useMemo(
    () => Array.from(new Set(rows.map((r) => r.Warehouse))).sort(),
    [rows]
  );

  const filteredRows = useMemo(
    () => rows.filter((r) => warehouse === "all" || r.Warehouse === warehouse),
    [rows, warehouse]
  );

  const aggs = useMemo(() => {
    const all = aggregateByVariety(filteredRows);
    if (!search) return all;
    return all.filter((a) => a.key.toLowerCase().includes(search.toLowerCase()));
  }, [filteredRows, search]);

  // Mixed Herb blends are priced as whole-pack totals ($20-30), not
  // per-unit like every other variety ($0.5-$1.6, see IsMixedHerbWholePack
  // on SalesRow) -- comparing them on one linear price axis squashed the
  // other 20 varieties into an unreadable sliver. Split into two charts,
  // each on its own natural scale, instead of normalizing the whole-pack
  // price away -- it's the real figure for these, not an artifact.
  const singleUnitPriceData = useMemo(() => {
    const singleUnitAggs = aggregateByVariety(
      filteredRows.filter((r) => r.IsMixedHerbWholePack !== 1)
    ).filter((a) => !search || a.key.toLowerCase().includes(search.toLowerCase()));
    return toBarData(singleUnitAggs, "avgUnitPrice", "desc");
  }, [filteredRows, search]);

  const mixedHerbPriceData = useMemo(() => {
    const mixedHerbAggs = aggregateByVariety(
      filteredRows.filter((r) => r.IsMixedHerbWholePack === 1)
    ).filter((a) => !search || a.key.toLowerCase().includes(search.toLowerCase()));
    return toBarData(mixedHerbAggs, "avgUnitPrice", "desc");
  }, [filteredRows, search]);

  const costRatioData = toBarData(aggs, "costRatio", "asc");
  const marginData = toBarData(aggs, "grossMargin", "desc");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder="Filter by variety…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8"
          />
        </div>
        <Select value={warehouse} onValueChange={(v) => setWarehouse(v ?? "all")}>
          <SelectTrigger className="h-9 w-full sm:w-48">
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Most expensive → least expensive variety (Avg Unit Price)
          </CardTitle>
          {mixedHerbPriceData.length > 0 && (
            <CardDescription>
              Single-unit varieties only — Mixed Herb blends are priced by the whole pack, not per
              unit, so they&apos;re shown separately below.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <StatChips data={singleUnitPriceData} valueType="currency" unit="varieties" />
          <RankedBarChart data={singleUnitPriceData} valueType="currency" />
        </CardContent>
      </Card>

      {mixedHerbPriceData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mixed Herb blends — whole-pack price</CardTitle>
            <CardDescription>
              These varieties are priced as a whole pack (e.g. a 32 CT blend), not per single herb
              unit, so they don&apos;t belong on the same scale as the single-unit chart above.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StatChips data={mixedHerbPriceData} valueType="currency" unit="blends" />
            <RankedBarChart data={mixedHerbPriceData} valueType="currency" />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Best Cost Ratio by variety (lowest first)</CardTitle>
          </CardHeader>
          <CardContent>
            <StatChips data={costRatioData} valueType="percent" unit="varieties" />
            <RankedBarChart
              data={costRatioData}
              valueType="percent"
              barColor="var(--color-chart-2)"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Best Gross Margin by variety (highest first)</CardTitle>
          </CardHeader>
          <CardContent>
            <StatChips data={marginData} valueType="percent" unit="varieties" />
            <RankedBarChart
              data={marginData}
              valueType="percent"
              barColor="var(--color-success)"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
