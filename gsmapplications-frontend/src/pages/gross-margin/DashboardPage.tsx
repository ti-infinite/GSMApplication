import { useSalesData } from "@/entities/gross-margin-sales-row";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Skeleton } from "@/shared/ui/skeleton";
import { KpiCards } from "@/widgets/gross-margin-kpi-cards";
import { SalesTable } from "@/widgets/gross-margin-sales-table";
import { VarietyRankingCharts } from "@/widgets/gross-margin-variety-ranking-charts";
import { ClientRankingCharts } from "@/widgets/gross-margin-client-ranking-charts";
import { VarietyClientExplorer } from "@/widgets/gross-margin-variety-client-explorer";
import { CostBreakdownTable } from "@/widgets/gross-margin-cost-breakdown-table";

export default function DashboardPage() {
  const { rows, loading, error, lastFetched } = useSalesData();

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header>
        <div>
          <h1 className="text-xl font-bold sm:text-2xl text-foreground">Gross Margin Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Infinite Herbs
            {lastFetched && ` · updated ${lastFetched.toLocaleTimeString()}`}
          </p>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Couldn&apos;t load data from db_ai.Sales: {error}. It retries automatically; confirm NHUBEX is reachable if this persists.
        </div>
      )}

      {loading && rows.length === 0 ? (
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
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="explorer">Sales Explorer</TabsTrigger>
            <TabsTrigger value="variety-rankings">Variety Rankings</TabsTrigger>
            <TabsTrigger value="client-rankings">Client Rankings</TabsTrigger>
            <TabsTrigger value="variety-client">Variety × Client</TabsTrigger>
            <TabsTrigger value="breakdown">Cost Breakdown</TabsTrigger>
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
