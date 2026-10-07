import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
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
import { aggregateByCustomer, type SalesRow } from "@/entities/grossMarginSalesRow";
import { Search } from "lucide-react";

function toBarData(
  aggs: ReturnType<typeof aggregateByCustomer>,
  field: "costRatio" | "grossMargin",
  direction: "asc" | "desc"
): RankedBarDatum[] {
  return aggs
    .filter((a) => a[field] !== null)
    .sort((a, b) => (direction === "desc" ? (b[field]! - a[field]!) : (a[field]! - b[field]!)))
    .map((a) => ({ label: a.key, value: a[field] }));
}

export function ClientRankingCharts({ rows }: { rows: SalesRow[] }) {
  const [search, setSearch] = useState("");
  const [warehouse, setWarehouse] = useState("all");

  const warehouses = useMemo(
    () => Array.from(new Set(rows.map((r) => r.Warehouse))).sort(),
    [rows]
  );

  const aggs = useMemo(() => {
    const filteredRows = rows.filter((r) => warehouse === "all" || r.Warehouse === warehouse);
    const all = aggregateByCustomer(filteredRows);
    if (!search) return all;
    return all.filter((a) => a.key.toLowerCase().includes(search.toLowerCase()));
  }, [rows, warehouse, search]);

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
            placeholder="Filter by customer…"
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clients ranked by Cost Ratio (lowest first)</CardTitle>
          </CardHeader>
          <CardContent>
            <StatChips data={costRatioData} />
            <RankedBarChart
              data={costRatioData}
              valueType="percent"
              barColor="var(--color-chart-2)"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clients ranked by Gross Margin (highest first)</CardTitle>
          </CardHeader>
          <CardContent>
            <StatChips data={marginData} />
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
