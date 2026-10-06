"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Skeleton } from "@/shared/ui/skeleton";
import { Button } from "@/shared/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { ReferenceLogTable } from "@/shared/ui/reference-log-table";
import { downloadReferenceTemplate } from "@/shared/ui/reference-bulk-upload";
import { grossMarginFetch as relayFetch } from "@/shared/lib/ihAgent";
import { fetchCommissions, type CommissionRow } from "@/entities/gross-margin-commission";
import { costReferenceApi, type CostReferenceRow } from "@/entities/gross-margin-cost-reference";
import { extraCostApi, type ExtraCostRow } from "@/entities/gross-margin-extra-cost";
import { fetchRebates, type RebateRow } from "@/entities/gross-margin-rebate";
import type { SalesRow } from "@/entities/gross-margin-sales-row";
import { transportCostApi, type TransportCostRow } from "@/entities/gross-margin-transport-cost";
import { varietyDesegregationApi, type VarietyDesegregationRow } from "@/entities/gross-margin-variety-desegregation";
import { yieldsApi, type YieldRow } from "@/entities/gross-margin-yield";
import { CommissionCard, CommissionLogTable } from "@/features/gross-margin-manage-commission";
import { extraCostLogTableConfig, ExtraCostCard } from "@/features/gross-margin-manage-extra-cost";
import { transportCostLogTableConfig, TransportCostCard } from "@/features/gross-margin-manage-transport-cost";
import { yieldsLogTableConfig, YieldsCard } from "@/features/gross-margin-manage-yield";
import { costReferenceLogTableConfig, CostReferenceCard } from "@/features/gross-margin-manage-cost-reference";
import { varietyDesegregationLogTableConfig, VarietyDesegregationCard } from "@/features/gross-margin-manage-variety-desegregation";
import { RebateCard, RebateLogTable } from "@/features/gross-margin-manage-rebate";

// No access gate here at all (2026-09-29) -- this app is headed for a real
// GSM tab, where GSM's own JWT auth gates it before it ever renders. Not
// re-implemented as a stopgap in the meantime, deliberately -- see
// src/main.tsx's comment for why.

// Next.js -> Vite conversion: onUpdate/onDelete for the 5 ReferenceLogTable-
// backed tabs below used to go through this app's own /api/<resource>/:id
// route (a thin proxy). Calls the relay directly now -- same {detail}
// error-shape read as everywhere else this conversion touched.
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
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [yieldsRows, setYieldsRows] = useState<YieldRow[]>([]);
  const [costReferenceRows, setCostReferenceRows] = useState<CostReferenceRow[]>([]);
  const [extraCostRows, setExtraCostRows] = useState<ExtraCostRow[]>([]);
  const [transportCostRows, setTransportCostRows] = useState<TransportCostRow[]>([]);
  const [rebateRows, setRebateRows] = useState<RebateRow[]>([]);
  const [varietyDesegregationRows, setVarietyDesegregationRows] = useState<VarietyDesegregationRow[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const loadAll = useCallback(async () => {
    setDataLoading(true);
    try {
      const [c, y, cr, ec, tc, rb, vd] = await Promise.all([
        fetchCommissions(),
        yieldsApi.list(),
        costReferenceApi.list(),
        extraCostApi.list(),
        transportCostApi.list(),
        fetchRebates(),
        varietyDesegregationApi.list(),
      ]);
      setCommissions(c);
      setYieldsRows(y);
      setCostReferenceRows(cr);
      setExtraCostRows(ec);
      setTransportCostRows(tc);
      setRebateRows(rb);
      setVarietyDesegregationRows(vd);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load Updates data");
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  function handleChanged() {
    loadAll();
    refreshSales();
  }

  return (
    <div className="space-y-6">
      {dataLoading &&
      commissions.length === 0 &&
      yieldsRows.length === 0 &&
      costReferenceRows.length === 0 &&
      extraCostRows.length === 0 &&
      transportCostRows.length === 0 ? (
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
            <CommissionCard rows={rows} onApplied={handleChanged} />
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
