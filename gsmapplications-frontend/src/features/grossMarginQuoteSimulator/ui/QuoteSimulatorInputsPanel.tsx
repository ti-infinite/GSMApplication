import { RotateCcw, SlidersHorizontal, DollarSign, ShoppingCart, ChevronUp, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import type { CommissionRow } from "@/entities/grossMarginCommission";
import type { TransportCostRow } from "@/entities/grossMarginTransportCost";
import { getCurrentFieldValue, type SalesRowMode, type QuoteOverrides, type RecomputeInputs } from "../model/recompute";
import {
  excludingPalletNegotiatedTransport,
  formatByFieldFormat,
  getCostFields,
  getPriceFields,
  type QuoteFieldMeta,
} from "../model/quoteFields";
import { formatCurrency } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { useQuoteFieldEditor } from "../model/useQuoteFieldEditor";

// The real baseline number for a field -- shown as the input's placeholder
// (formatted) so an empty (un-overridden) field reads as "$0.675", not the
// bare word "baseline", AND used as the anchor the custom stepper below
// steps from. Always resolved with an empty overrides object so it's the
// true baseline even while OTHER fields on the row are edited.
function baselineValue(key: string, inputs: RecomputeInputs, avgUnitPriceBase: number | null): number | null {
  return getCurrentFieldValue(key, inputs, {}, avgUnitPriceBase);
}

// Hides the browser's own spin buttons -- their built-in stepping treats an
// empty field as starting from 0, which is exactly the "why did clicking up
// once turn Box into $0.001 instead of $1.631" bug being fixed here. The
// chevrons rendered alongside replace them with stepping logic that's aware
// of the real baseline shown in the placeholder.
const HIDE_NATIVE_SPINNER = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

function Stepper({
  onStep,
  labelPrefix,
}: {
  onStep: (direction: 1 | -1) => void;
  labelPrefix: string;
}) {
  return (
    <div className="absolute inset-y-0 right-0 flex w-6 flex-col overflow-hidden rounded-r-lg border-l border-input">
      <button
        type="button"
        tabIndex={-1}
        aria-label={`Increase ${labelPrefix}`}
        onClick={() => onStep(1)}
        className="flex flex-1 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ChevronUp className="size-3" aria-hidden="true" />
      </button>
      <button
        type="button"
        tabIndex={-1}
        aria-label={`Decrease ${labelPrefix}`}
        onClick={() => onStep(-1)}
        className="flex flex-1 items-center justify-center border-t border-input text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ChevronDown className="size-3" aria-hidden="true" />
      </button>
    </div>
  );
}

export function QuoteSimulatorInputsPanel({
  mode,
  commission,
  transportCost,
  overrides,
  onChange,
  inputs,
  avgUnitPriceBase,
  transportMode,
  onTransportModeChange,
  onModeSelect,
}: {
  mode: SalesRowMode;
  commission: CommissionRow | null;
  transportCost: TransportCostRow | null;
  overrides: QuoteOverrides;
  onChange: (next: QuoteOverrides) => void;
  inputs: RecomputeInputs;
  avgUnitPriceBase: number | null;
  transportMode: "direct" | "pallet";
  onTransportModeChange: (mode: "direct" | "pallet") => void;
  // Lets a "none" row (no matched purchase cost at all -- either a real row
  // missing a Cost Reference/Yield, or a manually-started quote for a
  // product with no data yet) pick a hypothetical sourcing basis so cost
  // fields become enterable. Purely local simulator state -- never writes
  // back to the real Flag on any actual db_ai.Sales row.
  onModeSelect?: (mode: "A" | "B") => void;
}) {
  const { packQty, errors, wholePackFields, displayValue, setField, resetField, resetAll, toggleWholePack, stepValue } =
    useQuoteFieldEditor({ inputs, overrides, onChange, onTransportModeChange });

  const canNegotiatePallet =
    transportCost !== null &&
    transportCost.TransportUnitCost !== null &&
    transportCost.Qty !== null &&
    transportCost.BoxesXPallet !== null;

  const priceFields = getPriceFields(commission?.CommissionType ?? null);
  const costFields = excludingPalletNegotiatedTransport(getCostFields(mode), transportMode);

  function fieldRow(f: QuoteFieldMeta) {
    const isWholePack = !!(f.supportsWholePackEntry && wholePackFields[f.key] && packQty);
    const text = displayValue(f.key, f);
    const err = errors[f.key];
    const base = baselineValue(f.key, inputs, avgUnitPriceBase);
    const displayBase = isWholePack && base !== null ? base * packQty! : base;
    return (
      <div key={f.key} className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
          <div className="flex items-center gap-2">
            {f.supportsWholePackEntry && packQty && packQty > 1 && (
              <div className="flex gap-0.5 rounded-md border border-input p-0.5 text-[0.65rem]">
                <button
                  type="button"
                  onClick={() => isWholePack && toggleWholePack(f)}
                  className={`rounded px-1.5 py-0.5 ${!isWholePack ? "bg-muted font-medium" : "text-muted-foreground"}`}
                >
                  Per unit
                </button>
                <button
                  type="button"
                  onClick={() => !isWholePack && toggleWholePack(f)}
                  className={`rounded px-1.5 py-0.5 ${isWholePack ? "bg-muted font-medium" : "text-muted-foreground"}`}
                >
                  Whole pack ÷{packQty}
                </button>
              </div>
            )}
            {text !== "" && (
              <button
                type="button"
                onClick={() => resetField(f.key)}
                className="text-muted-foreground hover:text-foreground"
                title="Reset to baseline"
              >
                <RotateCcw className="size-3" />
              </button>
            )}
          </div>
        </div>
        <div className="relative">
          <Input
            type="number"
            step={isWholePack ? String(Number(f.step) * packQty!) : f.step}
            value={text}
            onChange={(e) => setField(f.key, e.target.value, f)}
            placeholder={formatByFieldFormat(f.format, displayBase)}
            aria-invalid={!!err}
            className={cn("pr-6", HIDE_NATIVE_SPINNER)}
          />
          <Stepper labelPrefix={f.label} onStep={(direction) => stepValue(f, base, direction)} />
        </div>
        {f.supportsWholePackEntry && packQty && packQty > 1 && (
          <p className="text-[0.65rem] text-muted-foreground">
            Per single unit. Have a whole-pack cost instead? Flip the toggle above
            {base !== null && (
              <>
                {" "}
                — e.g. {formatCurrency(base * packQty)} for a {packQty}-pack → {formatCurrency(base)}/unit.
              </>
            )}
          </p>
        )}
        {err && <p className="text-xs text-destructive">{err}</p>}
      </div>
    );
  }

  if (mode === "none") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No cost basis for this row yet</CardTitle>
          <CardDescription>
            No purchase cost is on file for this Variety/Warehouse. Pick how it&apos;s sourced to
            enter cost values by hand and see a live margin — you can save these as a real Cost
            Reference afterward.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{priceFields.map(fieldRow)}</div>
          {onModeSelect && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">How is this sourced?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onModeSelect("A")}
                  className="flex-1 rounded-lg border border-input px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                >
                  <span className="font-medium">Bought pre-packaged</span>
                  <span className="block text-xs text-muted-foreground">
                    Supplier already packs it at the final size — enter a direct unit cost.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onModeSelect("B")}
                  className="flex-1 rounded-lg border border-input px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                >
                  <span className="font-medium">Bought raw, by the pound</span>
                  <span className="block text-xs text-muted-foreground">
                    We do the production/repacking ourselves — enter a $/lb price and Yield.
                  </span>
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <SlidersHorizontal className="size-4.5" aria-hidden="true" />
          </div>
          <div>
            <CardTitle>Adjust the inputs</CardTitle>
            <CardDescription>Every field defaults to the real baseline value until you change it.</CardDescription>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={resetAll}>
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Reset all
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <DollarSign className="size-3.5 text-success" aria-hidden="true" />
            Sales price
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{priceFields.map(fieldRow)}</div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <ShoppingCart className="size-3.5 text-[var(--chart-2)]" aria-hidden="true" />
              Purchase cost
            </p>
            {canNegotiatePallet && (
              <div className="flex gap-1 rounded-md border border-border p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => onTransportModeChange("direct")}
                  className={`rounded px-2 py-1 ${transportMode === "direct" ? "bg-muted font-medium" : "text-muted-foreground"}`}
                >
                  Transport: direct $
                </button>
                <button
                  type="button"
                  onClick={() => onTransportModeChange("pallet")}
                  className={`rounded px-2 py-1 ${transportMode === "pallet" ? "bg-muted font-medium" : "text-muted-foreground"}`}
                >
                  Negotiate Pallet Cost
                </button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {costFields.map(fieldRow)}
            {transportMode === "pallet" && transportCost && (
              <div key="palletCostOverride" className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Pallet Cost</label>
                  {displayValue("palletCostOverride") !== "" && (
                    <button
                      type="button"
                      onClick={() => resetField("palletCostOverride")}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="size-3" />
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    value={displayValue("palletCostOverride")}
                    onChange={(e) => setField("palletCostOverride", e.target.value)}
                    placeholder={formatCurrency(transportCost.PalletCost)}
                    className={cn("pr-6", HIDE_NATIVE_SPINNER)}
                  />
                  <Stepper
                    labelPrefix="Pallet Cost"
                    onStep={(direction) =>
                      stepValue(
                        { key: "palletCostOverride", label: "Pallet Cost", group: "cost", format: "currency", step: "0.01" },
                        transportCost.PalletCost,
                        direction
                      )
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Qty {transportCost.Qty} × Boxes/Pallet {transportCost.BoxesXPallet} — TransportUnitCost recomputes live.
                </p>
              </div>
            )}
          </div>
        </div>
        {mode === "C" && (
          <p className="text-xs text-muted-foreground">
            Mixed-herb blends move as one blended purchase-cost number in this version — per-component
            editing needs additional data this dashboard doesn&apos;t expose yet.
          </p>
        )}
        {mode === "B" && (
          <p className="text-xs text-muted-foreground">
            Purchase Cost reflects the current blended price across all suppliers — per-supplier
            decomposition isn&apos;t available yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
