import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Input } from "@/shared/ui/input";
import { Combobox } from "@/shared/ui/combobox";
import { RankedBarChart, type RankedBarDatum } from "@/shared/ui/ranked-bar-chart";
import { StatChips } from "@/shared/ui/stat-chips";
import { aggregateByVariety, type SalesRow } from "@/entities/grossMarginSalesRow";
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

  // Mixed Herb blends are priced as whole-pack totals, not per-unit like
  // every other variety (see IsMixedHerbWholePack on SalesRow) --
  // comparing them on one linear price axis squashed the rest into an
  // unreadable sliver, so they get their own chart on their own scale.
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

  const costRatioData = useMemo(() => toBarData(aggs, "costRatio", "asc"), [aggs]);
  const marginData = useMemo(() => toBarData(aggs, "grossMargin", "desc"), [aggs]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder="Filter varieties…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8"
          />
        </div>
        <div className="w-full sm:w-48">
          <Combobox
            value={warehouse}
            onChange={(v) => setWarehouse(v || "all")}
            options={[
              { value: "all", label: "All warehouses" },
              ...warehouses.map((w) => ({ value: w, label: w })),
            ]}
          />
        </div>
      </div>

      <Card>
        <Tabs defaultValue="price">
          <CardHeader>
            <TabsList>
              <TabsTrigger value="price">Price</TabsTrigger>
              {mixedHerbPriceData.length > 0 && (
                <TabsTrigger value="mixed-herb">Mixed Herb Price</TabsTrigger>
              )}
              <TabsTrigger value="cost-ratio">Cost Ratio</TabsTrigger>
              <TabsTrigger value="margin">Gross Margin</TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent>
            <TabsContent value="price" className="mt-0">
              <CardTitle className="mb-1 text-base">
                Most expensive → least expensive variety (Avg Unit Price)
              </CardTitle>
              {mixedHerbPriceData.length > 0 && (
                <CardDescription className="mb-4">
                  Single-unit varieties only — Mixed Herb blends are priced by the whole pack, not
                  per unit, so they&apos;re shown on their own tab.
                </CardDescription>
              )}
              <StatChips data={singleUnitPriceData} valueType="currency" unit="varieties" />
              <RankedBarChart data={singleUnitPriceData} valueType="currency" />
            </TabsContent>

            {mixedHerbPriceData.length > 0 && (
              <TabsContent value="mixed-herb" className="mt-0">
                <CardTitle className="mb-1 text-base">Mixed Herb blends — whole-pack price</CardTitle>
                <CardDescription className="mb-4">
                  These varieties are priced as a whole pack (e.g. a 32 CT blend), not per single
                  herb unit, so they don&apos;t belong on the same scale as the Price tab.
                </CardDescription>
                <StatChips data={mixedHerbPriceData} valueType="currency" unit="blends" />
                <RankedBarChart data={mixedHerbPriceData} valueType="currency" />
              </TabsContent>
            )}

            <TabsContent value="cost-ratio" className="mt-0">
              <CardTitle className="mb-4 text-base">Best Cost Ratio by variety (lowest first)</CardTitle>
              <StatChips data={costRatioData} valueType="percent" unit="varieties" />
              <RankedBarChart data={costRatioData} valueType="percent" barColor="var(--color-chart-2)" />
            </TabsContent>

            <TabsContent value="margin" className="mt-0">
              <CardTitle className="mb-4 text-base">Best Gross Margin by variety (highest first)</CardTitle>
              <StatChips data={marginData} valueType="percent" unit="varieties" />
              <RankedBarChart data={marginData} valueType="percent" barColor="var(--color-success)" />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
