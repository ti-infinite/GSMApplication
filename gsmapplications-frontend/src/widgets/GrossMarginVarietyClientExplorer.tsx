import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Combobox } from "@/shared/ui/combobox";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { RankedBarChart, type RankedBarDatum } from "@/shared/ui/ranked-bar-chart";
import { StatChips } from "@/shared/ui/stat-chips";
import { Heatmap } from "./GrossMarginHeatmap";
import { customersForVariety, buildHeatmapData, type RankMetric, type SalesRow } from "@/entities/grossMarginSalesRow";
import { Search } from "lucide-react";

const METRICS: { value: RankMetric; label: string }[] = [
  { value: "AvgUnitPrice", label: "Avg Unit Price" },
  { value: "CostRatio", label: "Cost Ratio" },
  { value: "GrossMargin", label: "Gross Margin" },
];

export function VarietyClientExplorer({ rows }: { rows: SalesRow[] }) {
  const varietyCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) counts.set(r.Variety, (counts.get(r.Variety) ?? 0) + 1);
    return counts;
  }, [rows]);
  const varieties = useMemo(
    () => Array.from(varietyCounts.keys()).sort(),
    [varietyCounts]
  );
  const [view, setView] = useState<"bar" | "heatmap">("bar");
  const [metric, setMetric] = useState<RankMetric>("AvgUnitPrice");
  const [selectedVariety, setSelectedVariety] = useState<string>(varieties[0] ?? "");
  const [customerFilter, setCustomerFilter] = useState("");

  const barData: RankedBarDatum[] = useMemo(() => {
    const aggs = customersForVariety(rows, selectedVariety);
    const field = metric === "AvgUnitPrice" ? "avgUnitPrice" : metric === "CostRatio" ? "costRatio" : "grossMargin";
    const better = metric === "CostRatio" ? "asc" : "desc"; // lower cost ratio = better, higher price/margin = "first"
    return aggs
      .filter((a) => a[field] !== null)
      .filter((a) => a.key.toLowerCase().includes(customerFilter.toLowerCase()))
      .sort((a, b) => (better === "desc" ? b[field]! - a[field]! : a[field]! - b[field]!))
      .map((a) => ({ label: a.key, value: a[field] }));
  }, [rows, selectedVariety, metric, customerFilter]);

  const heatmapData = useMemo(() => {
    const full = buildHeatmapData(rows, metric);
    if (!customerFilter) return full;
    return {
      ...full,
      customers: full.customers.filter((c) => c.toLowerCase().includes(customerFilter.toLowerCase())),
    };
  }, [rows, metric, customerFilter]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Variety × Client explorer</CardTitle>
          <Tabs value={view} onValueChange={(v) => setView(v as "bar" | "heatmap")}>
            <TabsList>
              <TabsTrigger value="bar">Ranked bar chart</TabsTrigger>
              <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-full sm:w-44">
            <Combobox
              value={metric}
              onChange={(v) => setMetric(v as RankMetric)}
              options={METRICS.map((m) => ({ value: m.value, label: m.label }))}
            />
          </div>
          {view === "bar" && (
            <div className="w-full sm:w-72">
              <Combobox
                value={selectedVariety}
                onChange={(v) => setSelectedVariety(v ?? "")}
                options={varieties.map((v) => ({
                  value: v,
                  label: `${v} (${varietyCounts.get(v)})`,
                }))}
                placeholder="Select a variety"
              />
            </div>
          )}
          <div className="relative w-full sm:w-auto">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              placeholder="Filter customers…"
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="h-8 w-full pl-8 text-sm sm:w-56"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {view === "bar" ? (
          <>
            <StatChips
              data={barData}
              valueType={metric === "AvgUnitPrice" ? "currency" : "percent"}
            />
            <RankedBarChart
              data={barData}
              valueType={metric === "AvgUnitPrice" ? "currency" : "percent"}
            />
          </>
        ) : (
          <Heatmap
            varieties={heatmapData.varieties}
            customers={heatmapData.customers}
            cells={heatmapData.cells}
            metric={metric}
          />
        )}
      </CardContent>
    </Card>
  );
}
