import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Input } from "@/shared/ui/input";
import { Combobox } from "@/shared/ui/combobox";
import { Field } from "@/shared/ui/field";
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
  const { t } = useTranslation();
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

  const costRatioData = useMemo(() => toBarData(aggs, "costRatio", "asc"), [aggs]);
  const marginData = useMemo(() => toBarData(aggs, "grossMargin", "desc"), [aggs]);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label={t("grossMargin.common.fields.customer")} className="sm:col-span-2">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  placeholder={t("grossMargin.dashboard.rankings.searchCustomers")}
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
        <Tabs defaultValue="cost-ratio">
          <CardHeader>
            <TabsList>
              <TabsTrigger value="cost-ratio">{t("grossMargin.dashboard.rankings.tabs.costRatio")}</TabsTrigger>
              <TabsTrigger value="margin">{t("grossMargin.dashboard.rankings.tabs.grossMargin")}</TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent>
            <TabsContent value="cost-ratio" className="mt-0">
              <CardTitle className="mb-4 text-base">{t("grossMargin.dashboard.rankings.clientsCostRatioTitle")}</CardTitle>
              <StatChips data={costRatioData} />
              <RankedBarChart data={costRatioData} valueType="percent" barColor="var(--color-chart-2)" />
            </TabsContent>

            <TabsContent value="margin" className="mt-0">
              <CardTitle className="mb-4 text-base">{t("grossMargin.dashboard.rankings.clientsMarginTitle")}</CardTitle>
              <StatChips data={marginData} />
              <RankedBarChart data={marginData} valueType="percent" barColor="var(--color-success)" />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
