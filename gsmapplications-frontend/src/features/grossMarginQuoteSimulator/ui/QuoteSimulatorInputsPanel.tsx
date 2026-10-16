import { RotateCcw, SlidersHorizontal, DollarSign, ShoppingCart, ChevronUp, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Field, FieldToggle } from "@/shared/ui/field";
import { decimalInputProps } from "@/shared/lib/formValidation";
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

// The real baseline for a field, shown as the input's placeholder and used
// as the anchor the stepper below steps from. Always resolved with an empty
// overrides object so it stays the true baseline while other fields are edited.
function baselineValue(key: string, inputs: RecomputeInputs, avgUnitPriceBase: number | null): number | null {
  return getCurrentFieldValue(key, inputs, {}, avgUnitPriceBase);
}

// Hides the browser's own spin buttons -- their built-in stepping treats an
// empty field as starting from 0 rather than the real baseline. The chevrons
// rendered alongside replace them with baseline-aware stepping logic.
const HIDE_NATIVE_SPINNER = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

function Stepper({
  onStep,
  labelPrefix,
}: {
  onStep: (direction: 1 | -1) => void;
  labelPrefix: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="absolute inset-y-0 right-0 flex w-6 flex-col overflow-hidden rounded-r-lg border-l border-input">
      <button
        type="button"
        tabIndex={-1}
        aria-label={t("grossMargin.simulator.inputs.increase", { label: labelPrefix })}
        onClick={() => onStep(1)}
        className="flex flex-1 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ChevronUp className="size-3" aria-hidden="true" />
      </button>
      <button
        type="button"
        tabIndex={-1}
        aria-label={t("grossMargin.simulator.inputs.decrease", { label: labelPrefix })}
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
  // Lets a "none" row pick a hypothetical sourcing basis so cost fields
  // become enterable. Purely local simulator state -- never writes back to
  // the real Flag on any actual db_ai.Sales row.
  onModeSelect?: (mode: "A" | "B") => void;
}) {
  const { t } = useTranslation();
  const { packQty, errors, wholePackFields, displayValue, setField, resetField, resetAll, toggleWholePack, stepValue } =
    useQuoteFieldEditor({ inputs, overrides, onChange, onTransportModeChange });
  const L = (key: string) => t(`grossMargin.simulator.fields.${key}`);

  const canNegotiatePallet =
    transportCost !== null &&
    transportCost.TransportUnitCost !== null &&
    transportCost.Qty !== null &&
    transportCost.BoxesXPallet !== null;

  const priceFields = getPriceFields(commission?.CommissionType ?? null, L);
  const costFields = excludingPalletNegotiatedTransport(getCostFields(mode, L), transportMode);

  function fieldRow(f: QuoteFieldMeta) {
    const isWholePack = !!(f.supportsWholePackEntry && wholePackFields[f.key] && packQty);
    const text = displayValue(f.key, f);
    const err = errors[f.key];
    const base = baselineValue(f.key, inputs, avgUnitPriceBase);
    const displayBase = isWholePack && base !== null ? base * packQty! : base;
    const showPackToggle = !!(f.supportsWholePackEntry && packQty && packQty > 1);
    return (
      <Field
        key={f.key}
        label={f.label}
        error={err}
        labelEnd={
          <div className="flex items-center gap-2">
            {showPackToggle && (
              <FieldToggle
                value={isWholePack ? "pack" : "unit"}
                options={[
                  { value: "unit", label: t("grossMargin.simulator.inputs.perUnit") },
                  { value: "pack", label: t("grossMargin.simulator.inputs.perPack", { packQty }) },
                ]}
                onChange={(next) => {
                  if ((next === "pack") !== isWholePack) toggleWholePack(f);
                }}
                ariaLabel={t("grossMargin.simulator.inputs.entryBasisAria", { label: f.label })}
              />
            )}
            {text !== "" && (
              <button
                type="button"
                onClick={() => resetField(f.key)}
                className="text-muted-foreground hover:text-foreground"
                title={t("grossMargin.simulator.inputs.resetToBaseline")}
              >
                <RotateCcw className="size-3" />
              </button>
            )}
          </div>
        }
      >
        <div className="relative">
          <Input
            {...decimalInputProps}
            value={text}
            onChange={(e) => setField(f.key, e.target.value, f)}
            placeholder={formatByFieldFormat(f.format, displayBase)}
            aria-invalid={!!err}
            className={cn("pr-6", HIDE_NATIVE_SPINNER)}
          />
          <Stepper labelPrefix={f.label} onStep={(direction) => stepValue(f, base, direction)} />
        </div>
      </Field>
    );
  }

  if (mode === "none") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("grossMargin.simulator.inputs.noCostTitle")}</CardTitle>
          <CardDescription>{t("grossMargin.simulator.inputs.noCostDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{priceFields.map(fieldRow)}</div>
          {onModeSelect && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{t("grossMargin.simulator.inputs.sourcingQuestion")}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onModeSelect("A")}
                  className="flex-1 rounded-lg border border-input px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                >
                  <span className="font-medium">{t("grossMargin.simulator.modes.A.plain")}</span>
                  <span className="block text-xs text-muted-foreground">{t("grossMargin.simulator.modes.A.description")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onModeSelect("B")}
                  className="flex-1 rounded-lg border border-input px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                >
                  <span className="font-medium">{t("grossMargin.simulator.modes.B.plain")}</span>
                  <span className="block text-xs text-muted-foreground">{t("grossMargin.simulator.modes.B.description")}</span>
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
            <CardTitle>{t("grossMargin.simulator.inputs.title")}</CardTitle>
            <CardDescription>{t("grossMargin.simulator.inputs.description")}</CardDescription>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={resetAll}>
          <RotateCcw className="size-3.5" aria-hidden="true" />
          {t("grossMargin.simulator.inputs.resetAll")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <DollarSign className="size-3.5 text-success" aria-hidden="true" />
            {t("grossMargin.simulator.inputs.salesPrice")}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{priceFields.map(fieldRow)}</div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <ShoppingCart className="size-3.5 text-[var(--chart-2)]" aria-hidden="true" />
              {t("grossMargin.simulator.inputs.purchaseCost")}
            </p>
            {canNegotiatePallet && (
              <FieldToggle
                value={transportMode}
                options={[
                  { value: "direct", label: t("grossMargin.simulator.inputs.transportDirect") },
                  { value: "pallet", label: t("grossMargin.simulator.inputs.transportPallet") },
                ]}
                onChange={onTransportModeChange}
                ariaLabel={t("grossMargin.simulator.inputs.transportAria")}
              />
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {costFields.map(fieldRow)}
            {transportMode === "pallet" && transportCost && (
              <Field
                key="palletCostOverride"
                label={L("palletCost")}
                error={errors.palletCostOverride}
                labelEnd={
                  displayValue("palletCostOverride") !== "" ? (
                    <button
                      type="button"
                      onClick={() => resetField("palletCostOverride")}
                      className="text-muted-foreground hover:text-foreground"
                      title={t("grossMargin.simulator.inputs.resetToBaseline")}
                    >
                      <RotateCcw className="size-3" />
                    </button>
                  ) : null
                }
              >
                <div className="relative">
                  <Input
                    {...decimalInputProps}
                    value={displayValue("palletCostOverride")}
                    onChange={(e) => setField("palletCostOverride", e.target.value)}
                    placeholder={formatCurrency(transportCost.PalletCost)}
                    aria-invalid={!!errors.palletCostOverride}
                    className={cn("pr-6", HIDE_NATIVE_SPINNER)}
                  />
                  <Stepper
                    labelPrefix={L("palletCost")}
                    onStep={(direction) =>
                      stepValue(
                        { key: "palletCostOverride", label: L("palletCost"), labelKey: "palletCost", group: "cost", format: "currency", step: "0.01" },
                        transportCost.PalletCost,
                        direction
                      )
                    }
                  />
                </div>
              </Field>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
