import { useState } from "react";
import { toast } from "sonner";
import { Trash2, FolderOpen, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import type { CommissionRow } from "@/entities/grossMarginCommission";
import type { RebateRow } from "@/entities/grossMarginRebate";
import type { SalesRow } from "@/entities/grossMarginSalesRow";
import type { TransportCostRow } from "@/entities/grossMarginTransportCost";
import { recomputeSalesRow, type QuoteOverrides } from "../model/recompute";
import { deleteScenario, listScenarios, resolveScenarioRow, saveScenario, type QuoteScenario } from "../model/quoteScenarios";
import { buildRecomputeInputsForRow, defaultPackQuantity } from "../model/quoteScenarioReferences";
import { buildQuoteRowValues, type QuoteScenarioExportEntry } from "../model/quoteScenarioExport";
import { formatPercent } from "@/shared/lib/format";
import { grossMarginFetch as relayFetch } from "@/shared/lib/ihAgent";

// Local-only (browser storage) scenario save/load -- explicitly not written
// to NHUBEX. See lib/quote-scenarios.ts for the schema and the "why local"
// rationale. The Excel export is the one place these saved scenarios leave
// the browser -- each is resolved back into a full RecomputeResult
// (matching the same Commission/Rebate/TransportCost lookups the live
// simulator uses) right before it's sent to the server to become a
// workbook row.
export function QuoteSimulatorScenarioManager({
  baseline,
  overrides,
  packQuantity,
  onLoad,
  rows,
  commissions,
  rebates,
  transportCosts,
}: {
  baseline: SalesRow;
  overrides: QuoteOverrides;
  packQuantity: number;
  onLoad: (scenario: QuoteScenario) => void;
  rows: SalesRow[];
  commissions: CommissionRow[];
  rebates: RebateRow[];
  transportCosts: TransportCostRow[];
}) {
  // Lazy initializer -- reads localStorage once on mount without a
  // separate effect+setState round-trip (avoids the cascading-render
  // pattern React now warns about for effect-only state seeding).
  const [scenarios, setScenarios] = useState<QuoteScenario[]>(() => listScenarios());
  const [name, setName] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  function refresh() {
    setScenarios(listScenarios());
  }

  function handleSave() {
    if (!name.trim()) {
      toast.error("Give this scenario a name first.");
      return;
    }
    if (Object.keys(overrides).length === 0) {
      toast.error("Nothing's been changed yet — adjust an input before saving.");
      return;
    }
    const result = saveScenario(name.trim(), baseline, overrides, packQuantity);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Saved "${name.trim()}".`);
    setName("");
    refresh();
  }

  function handleDelete(id: string, scenarioName: string) {
    deleteScenario(id);
    toast.success(`Deleted "${scenarioName}".`);
    refresh();
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      const entries: QuoteScenarioExportEntry[] = scenarios.map((s) => {
        const row = resolveScenarioRow(s, rows) ?? s.baselineSnapshot;
        const inputs = buildRecomputeInputsForRow(row, commissions, rebates, transportCosts);
        const result = recomputeSalesRow(inputs, s.overrides);
        return {
          name: s.name,
          savedAt: s.savedAt,
          mode: result.mode,
          packQuantity: s.packQuantity ?? defaultPackQuantity(row),
          inputs,
          overrides: s.overrides,
          row: result.row,
          avgUnitPriceBase: result.avgUnitPriceBase,
          commissionType: inputs.commission?.CommissionType ?? null,
        };
      });
      const quotes = entries.map((entry) => ({
        name: entry.name,
        savedAt: entry.savedAt,
        values: buildQuoteRowValues(entry),
      }));
      const res = await relayFetch("/export/quoteScenarios", {
        method: "POST",
        body: JSON.stringify({ quotes }),
      });
      if (!res.ok) {
        toast.error("Failed to build the export.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `infinite-herbs-saved-quotes-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to reach the server. Try again.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Scenarios</CardTitle>
          <CardDescription>Saved only in this browser — never written to the production database.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting || scenarios.length === 0}>
          <Download aria-hidden="true" />
          {isExporting ? "Preparing…" : "Download saved quotes"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input placeholder="Name this scenario…" value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={handleSave} disabled={!name.trim()}>
            Save current
          </Button>
        </div>

        {scenarios.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No saved scenarios yet.</p>
        ) : (
          <div className="space-y-2">
            {scenarios.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.baselineIdentity.variety} · {s.baselineIdentity.customer} · {s.baselineIdentity.warehouse}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Object.keys(s.overrides).length} change{Object.keys(s.overrides).length === 1 ? "" : "s"} · saved{" "}
                    {new Date(s.savedAt).toLocaleString("en-US")}
                    {s.baselineSnapshot.GrossMargin !== null && ` · baseline margin ${formatPercent(s.baselineSnapshot.GrossMargin)}`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon-sm" onClick={() => onLoad(s)} title="Load this scenario">
                    <FolderOpen className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleDelete(s.id, s.name)}
                    title="Delete this scenario"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
