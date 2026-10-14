import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Skeleton } from "@/shared/ui/skeleton";
import { Button } from "@/shared/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { ReferenceLogTable } from "@/shared/ui/reference-log-table";
import { downloadReferenceTemplate } from "@/shared/ui/reference-bulk-upload";
import { grossMarginFetch as relayFetch } from "@/shared/lib/ihAgent";
import { GROSS_MARGIN_REF_QUERY_KEY } from "@/shared/lib/grossMarginReferenceQueryKeys";
import { useCommissions, type CommissionRow } from "@/entities/grossMarginCommission";
import { useCostReferences, type CostReferenceRow } from "@/entities/grossMarginCostReference";
import { useExtraCosts, type ExtraCostRow } from "@/entities/grossMarginExtraCost";
import { useRebates, type RebateRow } from "@/entities/grossMarginRebate";
import type { SalesRow } from "@/entities/grossMarginSalesRow";
import { useTransportCosts, type TransportCostRow } from "@/entities/grossMarginTransportCost";
import { useVarietyDesegregations, type VarietyDesegregationRow } from "@/entities/grossMarginVarietyDesegregation";
import { useYields, type YieldRow } from "@/entities/grossMarginYield";
import { CommissionCard, CommissionLogTable } from "@/features/grossMarginManageCommission";
import { extraCostLogTableConfig, ExtraCostCard } from "@/features/grossMarginManageExtraCost";
import { transportCostLogTableConfig, TransportCostCard } from "@/features/grossMarginManageTransportCost";
import { yieldsLogTableConfig, YieldsCard } from "@/features/grossMarginManageYield";
import { costReferenceLogTableConfig, CostReferenceCard } from "@/features/grossMarginManageCostReference";
import { varietyDesegregationLogTableConfig, VarietyDesegregationCard } from "@/features/grossMarginManageVarietyDesegregation";
import { RebateCard, RebateLogTable } from "@/features/grossMarginManageRebate";

// No access gate here -- this app is headed for a real GSM tab, where
// GSM's own JWT auth gates it before it ever renders. Deliberately not
// re-implemented as a stopgap in the meantime -- see src/main.tsx's
// comment for why.

// onUpdate/onDelete for the 5 ReferenceLogTable-backed tabs below call the
// relay directly, reading the same {detail} error shape used everywhere
// else in this app.
async function updateResource(resource: string, id: number, values: Record<string, unknown>) {
  const res = await relayFetch(`/${resource}/${id}`, { method: "PUT", body: JSON.stringify(values) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.detail ?? "Failed to update.");
  return json;
}

async function deleteResourceOnRelay(resource: string, id: number) {
  const res = await relayFetch(`/${resource}/${id}`, { method: "DELETE" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.detail ?? "Failed to delete.");
  return json;
}

export function ReferenceDataTabs({ rows, refreshSales }: { rows: SalesRow[]; refreshSales: () => void }) {
  const queryClient = useQueryClient();
  const { commissions, isLoading: commissionsLoading, error: commissionsError } = useCommissions();
  const { yields: yieldsRows, isLoading: yieldsLoading, error: yieldsError } = useYields();
  const { costReferences: costReferenceRows, isLoading: costReferenceLoading, error: costReferenceError } = useCostReferences();
  const { extraCosts: extraCostRows, isLoading: extraCostLoading, error: extraCostError } = useExtraCosts();
  const { transportCosts: transportCostRows, isLoading: transportCostLoading, error: transportCostError } = useTransportCosts();
  const { rebates: rebateRows, isLoading: rebatesLoading, error: rebatesError } = useRebates();
  const { varietyDesegregations: varietyDesegregationRows, isLoading: varietyDesegregationLoading, error: varietyDesegregationError } =
    useVarietyDesegregations();

  // Skeleton only on a true cold load -- once any one of these has cached
  // data, the rest render instantly from cache too (they all mount together).
  const isDataLoading =
    commissionsLoading &&
    yieldsLoading &&
    costReferenceLoading &&
    extraCostLoading &&
    transportCostLoading &&
    rebatesLoading &&
    varietyDesegregationLoading;

  const firstError =
    commissionsError ?? yieldsError ?? costReferenceError ?? extraCostError ?? transportCostError ?? rebatesError ?? varietyDesegregationError;
  const lastToastedError = useRef<string | null>(null);
  useEffect(() => {
    if (firstError && firstError !== lastToastedError.current) {
      lastToastedError.current = firstError;
      toast.error(firstError);
    }
  }, [firstError]);

  function handleChanged() {
    queryClient.invalidateQueries({ queryKey: GROSS_MARGIN_REF_QUERY_KEY });
    refreshSales();
  }

  return (
    <div className="space-y-6">
      {isDataLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <Tabs defaultValue="commissions">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <TabsList>
              <TabsTrigger value="commissions">Commissions</TabsTrigger>
              <TabsTrigger value="extra-cost">Supplier Extra Cost</TabsTrigger>
              <TabsTrigger value="transport-cost">Transport Cost</TabsTrigger>
              <TabsTrigger value="yields">Yields</TabsTrigger>
              <TabsTrigger value="cost-reference">Cost Reference</TabsTrigger>
              <TabsTrigger value="rebate">Rebate</TabsTrigger>
              <TabsTrigger value="mixed-herbs">Mixed Herbs</TabsTrigger>
            </TabsList>
            <Button variant="outline" size="sm" onClick={downloadReferenceTemplate}>
              <Download className="size-3.5" aria-hidden="true" />
              Download Template
            </Button>
          </div>

          <TabsContent value="commissions" className="mt-6 space-y-6">
            <CommissionCard rows={rows} commissions={commissions} onApplied={handleChanged} />
            <CommissionLogTable rows={commissions} onChanged={handleChanged} />
          </TabsContent>

          <TabsContent value="extra-cost" className="mt-6 space-y-6">
            <ExtraCostCard rows={rows} onApplied={handleChanged} />
            <ReferenceLogTable<ExtraCostRow>
              {...extraCostLogTableConfig}
              rows={extraCostRows}
              onUpdate={(id, values) => updateResource("extra-cost", id, values)}
              onDelete={(id) => deleteResourceOnRelay("extra-cost", id)}
              onChanged={handleChanged}
            />
          </TabsContent>

          <TabsContent value="transport-cost" className="mt-6 space-y-6">
            <TransportCostCard rows={rows} onApplied={handleChanged} />
            <ReferenceLogTable<TransportCostRow>
              {...transportCostLogTableConfig}
              rows={transportCostRows}
              onUpdate={(id, values) => updateResource("transport-cost", id, values)}
              onDelete={(id) => deleteResourceOnRelay("transport-cost", id)}
              onChanged={handleChanged}
            />
          </TabsContent>

          <TabsContent value="yields" className="mt-6 space-y-6">
            <YieldsCard rows={rows} onApplied={handleChanged} />
            <ReferenceLogTable<YieldRow>
              {...yieldsLogTableConfig}
              rows={yieldsRows}
              onUpdate={(id, values) => updateResource("yields", id, values)}
              onDelete={(id) => deleteResourceOnRelay("yields", id)}
              onChanged={handleChanged}
            />
          </TabsContent>

          <TabsContent value="cost-reference" className="mt-6 space-y-6">
            <CostReferenceCard rows={rows} onApplied={handleChanged} />
            <ReferenceLogTable<CostReferenceRow>
              {...costReferenceLogTableConfig}
              rows={costReferenceRows}
              onUpdate={(id, values) => updateResource("cost-reference", id, values)}
              onDelete={(id) => deleteResourceOnRelay("cost-reference", id)}
              onChanged={handleChanged}
            />
          </TabsContent>

          <TabsContent value="rebate" className="mt-6 space-y-6">
            <RebateCard rows={rows} rebates={rebateRows} onApplied={handleChanged} />
            <RebateLogTable rows={rebateRows} onChanged={handleChanged} />
          </TabsContent>

          <TabsContent value="mixed-herbs" className="mt-6 space-y-6">
            <VarietyDesegregationCard rows={rows} onApplied={handleChanged} />
            <ReferenceLogTable<VarietyDesegregationRow>
              {...varietyDesegregationLogTableConfig}
              rows={varietyDesegregationRows}
              onUpdate={(id, values) => updateResource("variety-desegregation", id, values)}
              onDelete={(id) => deleteResourceOnRelay("variety-desegregation", id)}
              onChanged={handleChanged}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
