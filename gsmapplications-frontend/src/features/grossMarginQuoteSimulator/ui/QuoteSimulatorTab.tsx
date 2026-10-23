import { useTranslation } from "react-i18next";
import { Skeleton } from "@/shared/ui/skeleton";
import type { SalesRow } from "@/entities/grossMarginSalesRow";
import { useQuoteSimulatorState } from "../model/useQuoteSimulatorState";
import { QuoteSimulatorRowPicker } from "./QuoteSimulatorRowPicker";
import { QuoteSimulatorNewCustomerProductPicker } from "./QuoteSimulatorNewCustomerProductPicker";
import { QuoteSimulatorIdentityBar } from "./QuoteSimulatorIdentityBar";
import { QuoteSimulatorHeadline } from "./QuoteSimulatorHeadline";
import { QuoteSimulatorPackPricing } from "./QuoteSimulatorPackPricing";
import { QuoteSimulatorInputsPanel } from "./QuoteSimulatorInputsPanel";
import { QuoteSimulatorSaveReferenceBanner } from "./QuoteSimulatorSaveReferenceBanner";
import { QuoteSimulatorTargetSolver } from "./QuoteSimulatorTargetSolver";
import { QuoteSimulatorComparisonTable } from "./QuoteSimulatorComparisonTable";
import { QuoteSimulatorTransparencyPanel } from "./QuoteSimulatorTransparencyPanel";
import { QuoteSimulatorScenarioManager } from "./QuoteSimulatorScenarioManager";
import { QuoteRadarChart } from "./QuoteRadarChart";
import { QuoteHeadlineCharts } from "./QuoteHeadlineCharts";
import { QuoteCostCompositionChart } from "./QuoteCostCompositionChart";
import { QuoteDriverImpact } from "./QuoteDriverImpact";
import { QuoteNegotiationHeadroom } from "./QuoteNegotiationHeadroom";

export function QuoteSimulatorTab({
  rows,
  refreshKey,
}: {
  rows: SalesRow[];

  refreshKey?: number | string;
}) {
  const { t, i18n } = useTranslation();
  const {
    isLoading,
    commissions,
    rebates,
    transportCosts,
    quoteFlow,
    selectedRow,
    isNewCustomerQuote,
    calculatedSkuForSave,
    overrides,
    setOverrides,
    selectionGeneration,
    transportMode,
    setTransportMode,
    packQuantity,
    setPackQuantity,
    commission,
    transportCost,
    costReference,
    yieldRow,
    children,
    inputs,
    result,
    estimates,
    loadReferenceData,
    handleSelectRow,
    handleLoadScenario,
    handleCreateQuote,
    handleModeSelect,
    handleQuoteFlowChange,
  } = useQuoteSimulatorState(rows, refreshKey);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <div className="flex shrink-0 flex-wrap gap-1 rounded-md border border-border p-0.5 text-xs">
          <button
            type="button"
            onClick={() => handleQuoteFlowChange("existing")}
            className={`rounded px-2.5 py-1.5 ${quoteFlow === "existing" ? "bg-muted font-medium" : "text-muted-foreground"}`}
          >
            {t("grossMargin.simulator.flows.existing")}
          </button>
          <button
            type="button"
            onClick={() => handleQuoteFlowChange("new-customer-product")}
            className={`rounded px-2.5 py-1.5 ${quoteFlow === "new-customer-product" ? "bg-muted font-medium" : "text-muted-foreground"}`}
          >
            {t("grossMargin.simulator.flows.newCustomerProduct")}
          </button>
        </div>
      </div>

      {quoteFlow === "existing" && (
        <QuoteSimulatorRowPicker rows={rows} selected={selectedRow} onSelect={handleSelectRow} />
      )}
      {quoteFlow === "new-customer-product" && (
        <QuoteSimulatorNewCustomerProductPicker rows={rows} onCreate={handleCreateQuote} />
      )}

      {selectedRow && inputs && result && (
        <>
          {result.warnings.length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {result.warnings.map((w) => (
                <p key={w}>{t(`grossMargin.simulator.warnings.${w}`)}</p>
              ))}
            </div>
          )}

          <QuoteSimulatorIdentityBar
            row={selectedRow}
            mode={result.mode}
            blendSummary={
              children.length > 0
                ? t("grossMargin.simulator.blend", { summary: children.map((c) => `${c.Quantity}× ${c.ChildVariety.split(" - ")[0]}`).join(", ") })
                : undefined
            }
            isNewCustomerQuote={isNewCustomerQuote}
          />

          <QuoteSimulatorHeadline actual={selectedRow} simulated={result.row} isNewCustomerQuote={isNewCustomerQuote} />

          <QuoteSimulatorPackPricing
            actual={selectedRow}
            simulated={result.row}
            mode={result.mode}
            quantity={packQuantity}
            onQuantityChange={setPackQuantity}
          />

          <QuoteSimulatorTargetSolver
            mode={result.mode}
            commissionType={commission?.CommissionType ?? null}
            inputs={inputs}
            overrides={overrides}
            onChange={setOverrides}
            transportMode={transportMode}
            transportCost={transportCost}
            currentGrossMargin={result.row.GrossMargin}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <QuoteSimulatorInputsPanel
              key={selectionGeneration}
              mode={result.mode}
              commission={commission}
              transportCost={transportCost}
              overrides={overrides}
              onChange={setOverrides}
              inputs={inputs}
              avgUnitPriceBase={result.avgUnitPriceBase}
              transportMode={transportMode}
              onTransportModeChange={setTransportMode}
              onModeSelect={handleModeSelect}
              sourcingSwitchable={estimates !== null}
              estimates={estimates}
              currentGrossMargin={result.row.GrossMargin}
              finalUnitCost={result.row.FinalUnitCost}
            />
            <QuoteSimulatorComparisonTable actual={selectedRow} simulated={result.row} isNewCustomerQuote={isNewCustomerQuote} />
          </div>

          {costReference === null && result.row.FinalUnitCost !== null && (
            <QuoteSimulatorSaveReferenceBanner
              mode={result.mode}
              variety={selectedRow.Variety}
              warehouse={selectedRow.Warehouse}
              inputs={inputs}
              overrides={overrides}
              avgUnitPriceBase={result.avgUnitPriceBase}
              calculatedSku={calculatedSkuForSave}
              estimates={estimates}
              onSaved={loadReferenceData}
            />
          )}

          <QuoteHeadlineCharts actual={selectedRow} simulated={result.row} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <QuoteRadarChart actual={selectedRow} simulated={result.row} />
            <QuoteCostCompositionChart actual={selectedRow} simulated={result.row} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <QuoteDriverImpact mode={result.mode} commissionType={commission?.CommissionType ?? null} inputs={inputs} overrides={overrides} />
            <QuoteNegotiationHeadroom mode={result.mode} commissionType={commission?.CommissionType ?? null} inputs={inputs} overrides={overrides} />
          </div>

          <QuoteSimulatorScenarioManager
            baseline={selectedRow}
            overrides={overrides}
            packQuantity={packQuantity}
            onLoad={handleLoadScenario}
            rows={rows}
            commissions={commissions}
            rebates={rebates}
            transportCosts={transportCosts}
          />

          <QuoteSimulatorTransparencyPanel row={result.row} mode={result.mode} avgUnitPriceBase={result.avgUnitPriceBase} />

          {costReference && (
            <p className="text-xs text-muted-foreground">
              {t("grossMargin.simulator.referenceOnFile", { date: new Date(costReference.UpdatedAt).toLocaleDateString(i18n.language) })}
              {yieldRow && t("grossMargin.simulator.yieldOnFile", { date: new Date(yieldRow.UpdatedAt).toLocaleDateString(i18n.language) })}
            </p>
          )}
        </>
      )}
    </div>
  );
}
