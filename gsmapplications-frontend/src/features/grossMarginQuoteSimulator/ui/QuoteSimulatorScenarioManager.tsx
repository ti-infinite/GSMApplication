import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Trash2, FolderOpen, Users } from "lucide-react";
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
import type { QuoteScenarioExportEntry } from "../model/quoteScenarioExport";
import { formatPercent } from "@/shared/lib/format";
import { savedQuotesApi, useInvalidateSavedQuotes } from "@/entities/grossMarginSavedQuote";
import { buildSavedQuoteBody } from "../model/savedQuotes";
import { QuoteBatchDialog } from "./QuoteBatchDialog";


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

  const { t, i18n } = useTranslation();
  const [scenarios, setScenarios] = useState<QuoteScenario[]>(() => listScenarios());
  const [name, setName] = useState("");
  const invalidateSavedQuotes = useInvalidateSavedQuotes();
  const [batchOpen, setBatchOpen] = useState(false);


  function toExportEntry(s: QuoteScenario): QuoteScenarioExportEntry {
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
  }

  function refresh() {
    setScenarios(listScenarios());
  }

  function handleSave() {
    if (!name.trim()) {
      toast.error(t("grossMargin.simulator.scenarios.nameFirst"));
      return;
    }
    if (Object.keys(overrides).length === 0) {
      toast.error(t("grossMargin.simulator.scenarios.nothingChanged"));
      return;
    }
    const result = saveScenario(name.trim(), baseline, overrides, packQuantity);
    if (!result.ok) {
      toast.error(t(`grossMargin.simulator.scenarios.${result.error}`));
      return;
    }
    toast.success(t("grossMargin.simulator.scenarios.saved", { name: name.trim() }));
    setName("");
    refresh();

    savedQuotesApi
      .create(buildSavedQuoteBody(toExportEntry(result.scenario), baseline))
      .then(() => invalidateSavedQuotes())
      .catch((err: unknown) => {
        toast.warning(t("grossMargin.simulator.scenarios.dbSaveFailed", { error: err instanceof Error ? err.message : String(err) }));
      });
  }

  function handleDelete(id: string, scenarioName: string) {
    deleteScenario(id);
    toast.success(t("grossMargin.simulator.scenarios.deleted", { name: scenarioName }));
    refresh();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>{t("grossMargin.simulator.scenarios.title")}</CardTitle>
          <CardDescription>{t("grossMargin.simulator.scenarios.description")}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input placeholder={t("grossMargin.simulator.scenarios.namePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={handleSave} disabled={!name.trim()}>
            {t("grossMargin.simulator.scenarios.saveCurrent")}
          </Button>
          <Button variant="outline" onClick={() => setBatchOpen(true)} title={t("grossMargin.simulator.batch.title")}>
            <Users aria-hidden="true" />
            {t("grossMargin.simulator.batch.open")}
          </Button>
        </div>
        {batchOpen && (
          <QuoteBatchDialog
            baseline={baseline}
            overrides={overrides}
            packQuantity={packQuantity}
            rows={rows}
            commissions={commissions}
            rebates={rebates}
            transportCosts={transportCosts}
            onClose={() => setBatchOpen(false)}
          />
        )}

        {scenarios.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t("grossMargin.simulator.scenarios.empty")}</p>
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
                    {t("grossMargin.simulator.scenarios.changes", { count: Object.keys(s.overrides).length })}
                    {t("grossMargin.simulator.scenarios.savedAt", { date: new Date(s.savedAt).toLocaleString(i18n.language) })}
                    {s.baselineSnapshot.GrossMargin !== null &&
                      t("grossMargin.simulator.scenarios.baselineMargin", { value: formatPercent(s.baselineSnapshot.GrossMargin) })}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon-sm" onClick={() => onLoad(s)} title={t("grossMargin.simulator.scenarios.load")}>
                    <FolderOpen className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleDelete(s.id, s.name)}
                    title={t("grossMargin.simulator.scenarios.delete")}
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
