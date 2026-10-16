import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Input } from "@/shared/ui/input";
import { Combobox } from "@/shared/ui/combobox";
import { Field } from "@/shared/ui/field";
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
  const { t } = useTranslation();
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
      <Card>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label={t("grossMargin.common.fields.variety")} className="sm:col-span-2">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  placeholder={t("grossMargin.dashboard.rankings.searchVarieties")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </Field>
            <Field label={t("grossMargin.common.fields.warehouse")}>
              <Combobox
                value={warehouse}
                onChange={(v) => setWarehouse(v || "all")}
                options={[
                  { value: "all", label: t("grossMargin.common.allWarehouses") },
                  ...warehouses.map((w) => ({ value: w, label: w })),
                ]}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <Tabs defaultValue="price">
          <CardHeader>
            <TabsList>
              <TabsTrigger value="price">{t("grossMargin.dashboard.rankings.tabs.price")}</TabsTrigger>
              {mixedHerbPriceData.length > 0 && (
                <TabsTrigger value="mixed-herb">{t("grossMargin.dashboard.rankings.tabs.mixedHerbPrice")}</TabsTrigger>
              )}
              <TabsTrigger value="cost-ratio">{t("grossMargin.dashboard.rankings.tabs.costRatio")}</TabsTrigger>
              <TabsTrigger value="margin">{t("grossMargin.dashboard.rankings.tabs.grossMargin")}</TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent>
            <TabsContent value="price" className="mt-0">
              <CardTitle className="mb-1 text-base">{t("grossMargin.dashboard.rankings.priceTitle")}</CardTitle>
              {mixedHerbPriceData.length > 0 && (
                <CardDescription className="mb-4">{t("grossMargin.dashboard.rankings.priceDescription")}</CardDescription>
              )}
              <StatChips data={singleUnitPriceData} valueType="currency" unit="varieties" />
              <RankedBarChart data={singleUnitPriceData} valueType="currency" />
            </TabsContent>

            {mixedHerbPriceData.length > 0 && (
              <TabsContent value="mixed-herb" className="mt-0">
                <CardTitle className="mb-1 text-base">{t("grossMargin.dashboard.rankings.mixedHerbTitle")}</CardTitle>
                <CardDescription className="mb-4">{t("grossMargin.dashboard.rankings.mixedHerbDescription")}</CardDescription>
                <StatChips data={mixedHerbPriceData} valueType="currency" unit="blends" />
                <RankedBarChart data={mixedHerbPriceData} valueType="currency" />
              </TabsContent>
            )}

            <TabsContent value="cost-ratio" className="mt-0">
              <CardTitle className="mb-4 text-base">{t("grossMargin.dashboard.rankings.costRatioTitle")}</CardTitle>
              <StatChips data={costRatioData} valueType="percent" unit="varieties" />
              <RankedBarChart data={costRatioData} valueType="percent" barColor="var(--color-chart-2)" />
            </TabsContent>

            <TabsContent value="margin" className="mt-0">
              <CardTitle className="mb-4 text-base">{t("grossMargin.dashboard.rankings.marginTitle")}</CardTitle>
              <StatChips data={marginData} valueType="percent" unit="varieties" />
              <RankedBarChart data={marginData} valueType="percent" barColor="var(--color-success)" />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
