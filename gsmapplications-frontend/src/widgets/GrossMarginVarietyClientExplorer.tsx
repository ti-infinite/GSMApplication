import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Field } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { Combobox } from "@/shared/ui/combobox";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { RankedBarChart, type RankedBarDatum } from "@/shared/ui/ranked-bar-chart";
import { StatChips } from "@/shared/ui/stat-chips";
import { Heatmap } from "./GrossMarginHeatmap";
import { customersForVariety, buildHeatmapData, type RankMetric, type SalesRow } from "@/entities/grossMarginSalesRow";
import { Search } from "lucide-react";

const METRICS: { value: RankMetric; labelKey: string }[] = [
  { value: "AvgUnitPrice", labelKey: "avgUnitPrice" },
  { value: "CostRatio", labelKey: "costRatio" },
  { value: "GrossMargin", labelKey: "grossMargin" },
];

export function VarietyClientExplorer({ rows }: { rows: SalesRow[] }) {
  const { t } = useTranslation();
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
      <CardHeader>
        <CardTitle>{t("grossMargin.dashboard.explorer.title")}</CardTitle>
        <CardAction>
          <Tabs value={view} onValueChange={(v) => setView(v as "bar" | "heatmap")}>
            <TabsList>
              <TabsTrigger value="bar">{t("grossMargin.dashboard.explorer.rankedBar")}</TabsTrigger>
              <TabsTrigger value="heatmap">{t("grossMargin.dashboard.explorer.heatmap")}</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label={t("grossMargin.dashboard.explorer.metric")}>
            <Combobox
              value={metric}
              onChange={(v) => setMetric((v || "AvgUnitPrice") as RankMetric)}
              options={METRICS.map((m) => ({ value: m.value, label: t(`grossMargin.dashboard.explorer.metrics.${m.labelKey}`) }))}
            />
          </Field>
          {view === "bar" && (
            <Field label={t("grossMargin.common.fields.variety")}>
              <Combobox
                value={selectedVariety}
                onChange={(v) => setSelectedVariety(v ?? "")}
                options={varieties.map((v) => ({ value: v, label: v }))}
                placeholder={t("grossMargin.common.selectVariety")}
              />
            </Field>
          )}
          <Field label={t("grossMargin.common.fields.customer")}>
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                placeholder={t("grossMargin.dashboard.rankings.searchCustomers")}
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="pl-8"
              />
            </div>
          </Field>
        </div>
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
