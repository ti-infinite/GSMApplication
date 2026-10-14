import { Skeleton } from "@/shared/ui/skeleton";
import type { SalesRow } from "@/entities/grossMarginSalesRow";
import { useQuoteSimulatorState } from "../model/useQuoteSimulatorState";
import { QuoteSimulatorRowPicker } from "./QuoteSimulatorRowPicker";
import { QuoteSimulatorNewCustomerPicker } from "./QuoteSimulatorNewCustomerPicker";
import { QuoteSimulatorNewVarietyPicker } from "./QuoteSimulatorNewVarietyPicker";
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
  // Bumps whenever the page's sales data refetches, so reference data added
  // elsewhere (the save banner, or another tab) reloads on the same beat.
  // Optional so other callers can render this without wiring it up.
  refreshKey?: number | string;
}) {
  const {
    isLoading,
    commissions,
    rebates,
    transportCosts,
    quoteFlow,
    selectedRow,
    isNewCustomerQuote,
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
    loadReferenceData,
    handleSelectRow,
    handleLoadScenario,
    handleCreateNewCustomerQuote,
    handleCreateNewVarietyQuote,
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Quote Simulator</h2>
          <p className="text-sm text-muted-foreground">
            Pick a row, then negotiate a supplier price, transport rate, rebate, or any other
            cost/price input to see how it would move that row&apos;s Gross Margin — nothing here
            touches production data.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1 self-start rounded-md border border-border p-0.5 text-xs">
          <button
            type="button"
            onClick={() => handleQuoteFlowChange("existing")}
            className={`rounded px-2.5 py-1.5 ${quoteFlow === "existing" ? "bg-muted font-medium" : "text-muted-foreground"}`}
          >
            Pick existing row
          </button>
          <button
            type="button"
            onClick={() => handleQuoteFlowChange("new-customer")}
            className={`rounded px-2.5 py-1.5 ${quoteFlow === "new-customer" ? "bg-muted font-medium" : "text-muted-foreground"}`}
          >
            Quote a new customer
          </button>
          <button
            type="button"
            onClick={() => handleQuoteFlowChange("new-variety")}
            className={`rounded px-2.5 py-1.5 ${quoteFlow === "new-variety" ? "bg-muted font-medium" : "text-muted-foreground"}`}
          >
            New Variety
          </button>
        </div>
      </div>

      {quoteFlow === "existing" && (
        <QuoteSimulatorRowPicker rows={rows} selected={selectedRow} onSelect={handleSelectRow} />
      )}
      {quoteFlow === "new-customer" && (
        <QuoteSimulatorNewCustomerPicker rows={rows} onCreate={handleCreateNewCustomerQuote} />
      )}
      {quoteFlow === "new-variety" && (
        <QuoteSimulatorNewVarietyPicker rows={rows} onCreate={handleCreateNewVarietyQuote} />
      )}

      {selectedRow && inputs && result && (
        <>
          {result.warnings.length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {result.warnings.map((w) => (
                <p key={w}>{w}</p>
              ))}
            </div>
          )}

          <QuoteSimulatorIdentityBar
            row={selectedRow}
            mode={result.mode}
            blendSummary={
              children.length > 0
                ? `Blend: ${children.map((c) => `${c.Quantity}× ${c.ChildVariety.split(" - ")[0]}`).join(", ")}`
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
              rows={rows}
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
              Reference on file: Cost Reference last updated {new Date(costReference.UpdatedAt).toLocaleDateString("en-US")}
              {yieldRow && ` · Yield last updated ${new Date(yieldRow.UpdatedAt).toLocaleDateString("en-US")}`}
            </p>
          )}
        </>
      )}
    </div>
  );
}
