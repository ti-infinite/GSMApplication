import { useTranslation } from "react-i18next";
import { useSalesData } from "@/entities/grossMarginSalesRow";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Skeleton } from "@/shared/ui/skeleton";
import { KpiCards } from "@/widgets/GrossMarginKpiCards";
import { SalesTable } from "@/widgets/GrossMarginSalesTable";
import { VarietyRankingCharts } from "@/widgets/GrossMarginVarietyRankingCharts";
import { ClientRankingCharts } from "@/widgets/GrossMarginClientRankingCharts";
import { VarietyClientExplorer } from "@/widgets/GrossMarginVarietyClientExplorer";
import { CostBreakdownTable } from "@/widgets/GrossMarginCostBreakdownTable";

export default function DashboardPage() {
  const { t } = useTranslation();
  const { rows, isLoading, error } = useSalesData();

  return (
    <div className="flex flex-1 flex-col gap-6">
      <h1 className="text-xl font-bold sm:text-2xl text-foreground">{t("grossMargin.pages.dashboardTitle")}</h1>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {t("grossMargin.common.loadError")}
        </div>
      )}

      {isLoading && rows.length === 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      ) : (
        <Tabs defaultValue="overview" className="flex-1">
          <TabsList>
            <TabsTrigger value="overview">{t("grossMargin.dashboard.tabs.overview")}</TabsTrigger>
            <TabsTrigger value="explorer">{t("grossMargin.dashboard.tabs.explorer")}</TabsTrigger>
            <TabsTrigger value="variety-rankings">{t("grossMargin.dashboard.tabs.varietyRankings")}</TabsTrigger>
            <TabsTrigger value="client-rankings">{t("grossMargin.dashboard.tabs.clientRankings")}</TabsTrigger>
            <TabsTrigger value="variety-client">{t("grossMargin.dashboard.tabs.varietyClient")}</TabsTrigger>
            <TabsTrigger value="breakdown">{t("grossMargin.dashboard.tabs.breakdown")}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <KpiCards rows={rows} />
          </TabsContent>
          <TabsContent value="explorer" className="mt-6">
            <SalesTable rows={rows} />
          </TabsContent>
          <TabsContent value="variety-rankings" className="mt-6">
            <VarietyRankingCharts rows={rows} />
          </TabsContent>
          <TabsContent value="client-rankings" className="mt-6">
            <ClientRankingCharts rows={rows} />
          </TabsContent>
          <TabsContent value="variety-client" className="mt-6">
            <VarietyClientExplorer rows={rows} />
          </TabsContent>
          <TabsContent value="breakdown" className="mt-6">
            <CostBreakdownTable rows={rows} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
